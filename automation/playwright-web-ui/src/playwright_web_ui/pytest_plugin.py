"""Pytest collection gate for immutable Playwright Web UI executions."""

from __future__ import annotations

import os
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING, Never, Protocol, cast

import allure
import allure_commons
import pytest
from _pytest._code.code import ExceptionInfo
from allure_commons.logger import AllureFileLogger
from allure_commons.types import AttachmentType

from playwright_web_ui.allure_guard import (
    AllureSecretError,
    AllureSecretGuard,
    GuardedAllureFileLogger,
)
from playwright_web_ui.artifact_gate import collect_artifact_gate_errors
from playwright_web_ui.artifacts import redact_secret_text
from playwright_web_ui.business_records import BusinessRecordRecorder
from playwright_web_ui.evidence import (
    AttachmentSink,
    EvidenceRecorder,
    StepContext,
)
from playwright_web_ui.manifest import (
    AutomationCase,
    CaseKey,
    ExecutionManifest,
    ManifestError,
    load_execution_manifest,
)

if TYPE_CHECKING:
    from collections.abc import Generator, Iterator

    from _pytest.reports import TestReport
    from _pytest.runner import CallInfo
    from _pytest.terminal import TerminalReporter
    from playwright.sync_api import Page

EXECUTOR_ID = "playwright-web-ui"
ATTEMPT_PATH_ENV = "AUTOMATION_ATTEMPT_PATH"
AUTH_COOKIE_ENV = "AUTOMATION_AUTH_COOKIE"
_MIN_SECRET_LENGTH = 4
_OPTION_DEST = "execution_manifest"
_MANIFEST_KEY: pytest.StashKey[ExecutionManifest] = pytest.StashKey()
_CASES_KEY: pytest.StashKey[dict[CaseKey, AutomationCase]] = pytest.StashKey()
_ATTEMPT_KEY: pytest.StashKey[AttemptRuntime] = pytest.StashKey()
_ITEM_CASE_KEY: pytest.StashKey[CaseKey] = pytest.StashKey()
_FAILED_REPORT_KEY: pytest.StashKey[TestReport] = pytest.StashKey()
_RECORDER_KEY: pytest.StashKey[EvidenceRecorder] = pytest.StashKey()
_GATE_ERRORS_KEY: pytest.StashKey[tuple[str, ...]] = pytest.StashKey()
_AUTH_COOKIE_KEY: pytest.StashKey[str | None] = pytest.StashKey()
_ALLURE_GUARD_KEY: pytest.StashKey[AllureSecretGuard] = pytest.StashKey()
_XDIST_SECRET_BREACH_KEY: pytest.StashKey[bool] = pytest.StashKey()
_XDIST_AUTH_COOKIE_INPUT = "playwright_web_ui_auth_cookie"
_XDIST_BREACH_OUTPUT = "playwright_web_ui_report_breach"


class _AllurePluginManager(Protocol):
    def register(self, plugin: object, name: str | None = None) -> str | None:
        """Register one Allure plugin implementation."""
        ...

    def unregister(
        self,
        plugin: object | None = None,
        name: str | None = None,
    ) -> object | None:
        """Unregister one Allure plugin implementation."""
        ...

    def get_name(self, plugin: object) -> str | None:
        """Return the registered name for one Allure plugin."""
        ...

    def get_plugins(self) -> set[object]:
        """Return all registered Allure plugins."""
        ...

    def is_registered(self, plugin: object) -> bool:
        """Return whether one Allure plugin is currently registered."""
        ...


class _XdistNode(Protocol):
    config: pytest.Config
    workerinput: dict[str, object]
    workeroutput: dict[str, object]


class _AllureAttach(Protocol):
    def __call__(
        self,
        body: bytes | str,
        name: str | None = None,
        attachment_type: AttachmentType | str | None = None,
        extension: str | None = None,
    ) -> None:
        """Attach data to the current Allure test result."""


@dataclass(frozen=True, slots=True)
class AttemptRuntime:
    """Preallocated attempt output roots inherited by controller and workers."""

    path: Path
    evidence: Path
    business_records: Path


class StepFixture(Protocol):
    """Strict callable contract for the structured step fixture."""

    def __call__(self, *, action: str, expected: str, target: str) -> StepContext:
        """Create one keyword-only structured checkpoint context."""
        ...


def pytest_addoption(parser: pytest.Parser) -> None:
    """Register the immutable execution-manifest path."""
    group = parser.getgroup("playwright-web-ui")
    group.addoption(
        "--execution-manifest",
        action="store",
        dest=_OPTION_DEST,
        metavar="PATH",
        help="validate collection and execution against an immutable manifest",
    )


@pytest.hookimpl(tryfirst=True)
def pytest_load_initial_conftests(
    early_config: pytest.Config,
    parser: pytest.Parser,
    args: list[str],
) -> None:
    """Protect secrets and output paths before third-party configure hooks run."""
    del parser, args
    namespace = early_config.known_args_namespace
    manifest_option = cast("str | None", getattr(namespace, _OPTION_DEST, None))
    if manifest_option is None:
        return
    cookie = os.environ.pop(AUTH_COOKIE_ENV, None)
    if cookie is not None:
        early_config.stash[_AUTH_COOKIE_KEY] = cookie
    _validate_initial_runtime_outputs(early_config)


@pytest.hookimpl(trylast=True)
def pytest_configure(config: pytest.Config) -> None:
    """Load the manifest once for both collection-only and executable runs."""
    config.addinivalue_line(
        "markers",
        "automation_case(project_id, feature_id, case_id): canonical automation identity",
    )
    manifest_option = cast("str | None", config.getoption(_OPTION_DEST, default=None))
    if manifest_option is None:
        return
    try:
        manifest = load_execution_manifest(Path(manifest_option))
    except ManifestError as error:
        msg = f"invalid execution manifest: {error}"
        raise pytest.UsageError(msg) from error
    if manifest.executor_id != EXECUTOR_ID:
        expected = f'"{EXECUTOR_ID}"'
        actual = f'"{manifest.executor_id}"'
        msg = f"execution manifest executor_id must be {expected}, got {actual}"
        raise pytest.UsageError(msg)
    config.stash[_MANIFEST_KEY] = manifest
    config.stash[_CASES_KEY] = {
        selected_case.key: selected_case for selected_case in manifest.cases
    }
    worker_input = cast(
        "dict[str, object] | None",
        getattr(config, "workerinput", None),
    )
    worker_cookie = (
        worker_input.pop(_XDIST_AUTH_COOKIE_INPUT, None) if worker_input is not None else None
    )
    if worker_cookie is not None and not isinstance(worker_cookie, str):
        msg = "AUTH_CONTEXT_INVALID: worker auth context must be a string"
        raise pytest.UsageError(msg)
    cookie = config.stash.get(_AUTH_COOKIE_KEY, None)
    if isinstance(worker_cookie, str):
        cookie = worker_cookie
    elif cookie is None:
        cookie = os.environ.pop(AUTH_COOKIE_ENV, None)
    config.stash[_AUTH_COOKIE_KEY] = cookie
    clean_alluredir = cast(
        "bool",
        config.getoption("clean_alluredir", default=False),
    )
    _reject_clean_alluredir(clean_alluredir=clean_alluredir)
    report_dir = cast(
        "str | None",
        config.getoption("allure_report_dir", default=None),
    )
    attempt = _load_attempt_runtime()
    if report_dir is not None and attempt is None:
        _raise_attempt_runtime_missing_for_allure()
    if attempt is not None:
        config.stash[_ATTEMPT_KEY] = attempt
        report_dir = _validate_allure_results_path(report_dir, attempt)
        guard = AllureSecretGuard(secret_values=_secret_values(config))
        _replace_allure_file_logger(
            config,
            guard,
            report_dir=report_dir,
        )
        config.stash[_ALLURE_GUARD_KEY] = guard


@pytest.hookimpl(optionalhook=True)
def pytest_configure_node(node: _XdistNode) -> None:
    """Transfer the protected auth context directly to an xdist worker."""
    cookie = node.config.stash.get(_AUTH_COOKIE_KEY, None)
    if cookie is not None:
        node.workerinput[_XDIST_AUTH_COOKIE_INPUT] = cookie


def pytest_collection_modifyitems(config: pytest.Config, items: list[pytest.Item]) -> None:
    """Select manifest cases and reject invalid or incomplete canonical collection."""
    manifest = config.stash.get(_MANIFEST_KEY, None)
    if manifest is None:
        return

    expected = {selected_case.key for selected_case in manifest.cases}
    selected: dict[CaseKey, list[str]] = defaultdict(list)
    selected_items: list[pytest.Item] = []
    deselected_items: list[pytest.Item] = []
    marker_errors: list[str] = []
    for item in items:
        try:
            key = _case_key_from_item(item)
        except ValueError as error:
            marker_errors.append(f"{item.nodeid}: {error}")
            continue
        if key in expected:
            selected[key].append(item.nodeid)
            item.stash[_ITEM_CASE_KEY] = key
            selected_items.append(item)
        else:
            deselected_items.append(item)

    if marker_errors:
        details = "\n  - ".join(marker_errors)
        msg = f"invalid automation_case markers:\n  - {details}"
        raise pytest.UsageError(msg)

    duplicates = {key: nodeids for key, nodeids in selected.items() if len(nodeids) > 1}
    if duplicates:
        details = "; ".join(
            f"{key}: {', '.join(nodeids)}" for key, nodeids in sorted(duplicates.items(), key=str)
        )
        msg = f"duplicate collected automation case: {details}"
        raise pytest.UsageError(msg)

    actual = set(selected)
    missing = sorted(expected - actual, key=str)
    if missing:
        parts = ["collection does not match execution manifest"]
        parts.append(f"missing: {', '.join(map(str, missing))}")
        raise pytest.UsageError("; ".join(parts))

    if deselected_items:
        items[:] = selected_items
        config.hook.pytest_deselected(items=deselected_items)


@pytest.hookimpl(trylast=True)
def pytest_runtest_setup(item: pytest.Item) -> None:
    """Reject outcome-control markers added dynamically by setup fixtures."""
    runtime_active = item.config.stash.get(_ATTEMPT_KEY, None) is not None
    canonical_item = item.stash.get(_ITEM_CASE_KEY, None) is not None
    forbidden = {"skip", "skipif", "xfail"}
    if (
        runtime_active
        and canonical_item
        and any(marker.name in forbidden for marker in item.iter_markers())
    ):
        msg = "AUTOMATION_OUTCOME_FORBIDDEN: dynamic skip/skipif/xfail markers are forbidden"
        raise AssertionError(msg)


@pytest.hookimpl(wrapper=True, trylast=True)
def pytest_runtest_makereport(
    item: pytest.Item,
    call: CallInfo[None],
) -> Generator[None, TestReport, TestReport]:
    """Expose the call report to synchronous fixture finalizers."""
    if call.excinfo is not None:
        call.excinfo = _sanitize_exception_info(
            call.excinfo,
            secret_values=_secret_values(item.config),
        )
    report = yield
    _sanitize_test_report(report, secret_values=_secret_values(item.config))
    runtime_active = item.config.stash.get(_ATTEMPT_KEY, None) is not None
    canonical_item = item.stash.get(_ITEM_CASE_KEY, None) is not None
    was_xfail = getattr(report, "wasxfail", None)
    if runtime_active and canonical_item and (report.skipped or was_xfail is not None):
        report.outcome = "failed"
        report.longrepr = (
            str(item.path),
            0,
            "AUTOMATION_OUTCOME_FORBIDDEN: runtime skip/xfail outcomes are forbidden",
        )
        call.excinfo = _forbidden_outcome_exception_info()
        if hasattr(report, "wasxfail"):
            delattr(report, "wasxfail")
    if report.failed and report.when in {"setup", "call"}:
        item.stash[_FAILED_REPORT_KEY] = report
    return report


@pytest.fixture(autouse=True, name="_selected_case_evidence")
def selected_case_evidence(request: pytest.FixtureRequest) -> Iterator[None]:
    """Bind every selected runtime case to one synchronous Page recorder."""
    item = _request_item(request)
    key = item.stash.get(_ITEM_CASE_KEY, None)
    attempt = request.config.stash.get(_ATTEMPT_KEY, None)
    cases = request.config.stash.get(_CASES_KEY, None)
    if key is None or attempt is None or cases is None:
        yield
        return
    page = cast("Page", request.getfixturevalue("page"))
    selected_case = cases[key]
    recorder = EvidenceRecorder(
        case_key=selected_case.key,
        evidence_root=attempt.evidence,
        page=page,
        attach=cast("AttachmentSink", _attach_allure),
        secret_values=_secret_values(request.config),
    )
    item.stash[_RECORDER_KEY] = recorder
    try:
        yield
        report = item.stash.get(_FAILED_REPORT_KEY, None)
        if report is not None and not recorder.failure_captured:
            recorder.capture_failure(report.longreprtext)
    finally:
        recorder.close()


@pytest.fixture
def step(request: pytest.FixtureRequest) -> StepFixture:
    """Return the current case recorder's structured checkpoint context factory."""
    _fixture_context(request)
    recorder = _request_item(request).stash.get(_RECORDER_KEY, None)
    if recorder is None:
        message = "EVIDENCE_RUNTIME_MISSING: selected case recorder was not initialized"
        raise pytest.UsageError(message)
    return recorder.step


@pytest.fixture
def business_records(request: pytest.FixtureRequest) -> BusinessRecordRecorder:
    """Return the manifest-governed, single-write business-record fixture."""
    selected_case, attempt = _fixture_context(request)
    return BusinessRecordRecorder(
        case_key=selected_case.key,
        policy=selected_case.business_record,
        records_root=attempt.business_records,
        secret_values=_secret_values(request.config),
    )


def pytest_sessionfinish(session: pytest.Session, exitstatus: int | pytest.ExitCode) -> None:
    """Gate controller success on durable evidence from every manifest case."""
    config = session.config
    guard = config.stash.get(_ALLURE_GUARD_KEY, None)
    local_breach = guard is not None and guard.breached
    worker_output = cast(
        "dict[str, object] | None",
        getattr(config, "workeroutput", None),
    )
    if local_breach and worker_output is not None:
        worker_output[_XDIST_BREACH_OUTPUT] = True
    distributed_breach = config.stash.get(_XDIST_SECRET_BREACH_KEY, False)
    if local_breach or distributed_breach:
        _record_gate_errors(
            config,
            ("ALLURE_SECRET_FORBIDDEN: protected report data was rejected",),
        )
        if exitstatus == pytest.ExitCode.OK:
            session.exitstatus = pytest.ExitCode.TESTS_FAILED
    if hasattr(config, "workerinput") or config.getoption("collectonly", default=False):
        return
    if exitstatus not in (pytest.ExitCode.OK, pytest.ExitCode.TESTS_FAILED):
        return
    manifest = config.stash.get(_MANIFEST_KEY, None)
    attempt = config.stash.get(_ATTEMPT_KEY, None)
    if manifest is None or attempt is None:
        return
    errors = collect_artifact_gate_errors(
        manifest,
        evidence_root=attempt.evidence,
        business_records_root=attempt.business_records,
        secret_values=_secret_values(config),
    )
    if not errors:
        return
    _record_gate_errors(config, errors)
    session.exitstatus = pytest.ExitCode.TESTS_FAILED


@pytest.hookimpl(optionalhook=True)
def pytest_testnodedown(node: _XdistNode, error: object | None) -> None:
    """Propagate a worker reporting breach to the xdist controller."""
    if error is not None:
        return
    worker_output = cast(
        "dict[str, object] | None",
        getattr(node, "workeroutput", None),
    )
    if worker_output is not None and worker_output.get(_XDIST_BREACH_OUTPUT) is True:
        node.config.stash[_XDIST_SECRET_BREACH_KEY] = True


def pytest_terminal_summary(
    terminalreporter: TerminalReporter,
    exitstatus: pytest.ExitCode,
    config: pytest.Config,
) -> None:
    """Render stable machine-searchable artifact gate failures."""
    del exitstatus
    errors = config.stash.get(_GATE_ERRORS_KEY, ())
    if not errors:
        return
    terminalreporter.write_sep("=", "playwright-web-ui artifact gate")
    for error in errors:
        terminalreporter.write_line(error)


def _case_key_from_marker(marker: pytest.Mark) -> CaseKey:
    if marker.args:
        msg = "automation_case accepts keyword arguments only"
        raise ValueError(msg)
    required = {"project_id", "feature_id", "case_id"}
    if set(marker.kwargs) != required:
        msg = "automation_case requires exactly project_id, feature_id, and case_id"
        raise ValueError(msg)
    values = {key: marker.kwargs[key] for key in required}
    if any(not isinstance(value, str) for value in values.values()):
        msg = "automation_case identity values must be strings"
        raise ValueError(msg)
    return CaseKey(
        project_id=cast("str", values["project_id"]),
        feature_id=cast("str", values["feature_id"]),
        case_id=cast("str", values["case_id"]),
    )


def _case_key_from_item(item: pytest.Item) -> CaseKey:
    forbidden = {"skip", "skipif", "xfail"}
    if any(marker.name in forbidden for marker in item.iter_markers()):
        message = "AUTOMATION_OUTCOME_FORBIDDEN: skip/skipif/xfail markers are forbidden"
        raise ValueError(message)
    markers = list(item.iter_markers(name="automation_case"))
    if len(markers) != 1:
        message = "expected exactly one automation_case marker"
        raise ValueError(message)
    return _case_key_from_marker(markers[0])


def _validate_initial_runtime_outputs(early_config: pytest.Config) -> None:
    """Reject unsafe Allure paths before its stock configure hook can mutate them."""
    namespace = early_config.known_args_namespace
    clean_alluredir = cast("bool", getattr(namespace, "clean_alluredir", False))
    _reject_clean_alluredir(clean_alluredir=clean_alluredir)
    report_dir = cast("str | None", getattr(namespace, "allure_report_dir", None))
    if report_dir is None:
        return
    attempt = _load_attempt_runtime()
    if attempt is None:
        _raise_attempt_runtime_missing_for_allure()
    _validate_allure_results_path(report_dir, attempt)


def _reject_clean_alluredir(*, clean_alluredir: bool) -> None:
    if clean_alluredir:
        message = (
            "ALLURE_CLEAN_FORBIDDEN: --clean-alluredir cannot be used with "
            "preallocated attempt outputs"
        )
        raise pytest.UsageError(message)


def _raise_attempt_runtime_missing_for_allure() -> Never:
    message = f"ATTEMPT_RUNTIME_MISSING: {ATTEMPT_PATH_ENV} is required when --alluredir is set"
    raise pytest.UsageError(message)


def _load_attempt_runtime() -> AttemptRuntime | None:
    configured = os.environ.get(ATTEMPT_PATH_ENV)
    if configured is None:
        return None
    path = Path(configured)
    if not configured or configured != configured.strip() or not path.is_absolute():
        message = f"ATTEMPT_RUNTIME_INVALID: {ATTEMPT_PATH_ENV} must be a trimmed absolute path"
        raise pytest.UsageError(message)
    try:
        resolved = path.resolve(strict=True)
    except OSError as error:
        message = f"ATTEMPT_RUNTIME_INVALID: attempt path does not exist: {path}"
        raise pytest.UsageError(message) from error
    if path != resolved or path.is_symlink() or not path.is_dir():
        message = f"ATTEMPT_RUNTIME_INVALID: attempt path must be a real directory: {path}"
        raise pytest.UsageError(message)
    outputs: dict[str, Path] = {}
    for name in ("evidence", "business-records"):
        output = path / name
        try:
            output_resolved = output.resolve(strict=True)
        except OSError as error:
            message = f"ATTEMPT_RUNTIME_INVALID: required output directory does not exist: {output}"
            raise pytest.UsageError(message) from error
        if output != output_resolved or output.is_symlink() or not output.is_dir():
            message = f"ATTEMPT_RUNTIME_INVALID: output must be a real directory: {output}"
            raise pytest.UsageError(message)
        outputs[name] = output
    return AttemptRuntime(
        path=path,
        evidence=outputs["evidence"],
        business_records=outputs["business-records"],
    )


def _fixture_context(
    request: pytest.FixtureRequest,
) -> tuple[AutomationCase, AttemptRuntime]:
    key = _request_item(request).stash.get(_ITEM_CASE_KEY, None)
    attempt = request.config.stash.get(_ATTEMPT_KEY, None)
    cases = request.config.stash.get(_CASES_KEY, None)
    if key is None or cases is None:
        message = "AUTOMATION_CASE_CONTEXT_MISSING: fixture requires one selected canonical case"
        raise pytest.UsageError(message)
    if attempt is None:
        message = f"ATTEMPT_RUNTIME_MISSING: {ATTEMPT_PATH_ENV} is required for runtime fixtures"
        raise pytest.UsageError(message)
    return cases[key], attempt


def _request_item(request: pytest.FixtureRequest) -> pytest.Item:
    # Pytest 9's FixtureRequest.node property lacks a return annotation.
    return cast("pytest.Item", request.node)  # pyright: ignore[reportUnknownMemberType]


def _attach_allure(body: bytes | str, *, name: str, media_type: str) -> None:
    attachment_types = {
        "application/json": AttachmentType.JSON,
        "image/png": AttachmentType.PNG,
        "text/plain": AttachmentType.TEXT,
    }
    attachment_type = attachment_types.get(media_type, media_type)
    attach = cast("_AllureAttach", allure.attach)
    attach(body, name=name, attachment_type=attachment_type)


def _secret_values(config: pytest.Config) -> tuple[str, ...]:
    cookie = config.stash.get(_AUTH_COOKIE_KEY, None)
    if cookie is None or len(cookie) < _MIN_SECRET_LENGTH:
        return ()
    return (cookie,)


def _validate_allure_results_path(report_dir: str | None, attempt: AttemptRuntime) -> str:
    if report_dir is None:
        msg = "ALLURE_RESULTS_REQUIRED: runtime requires --alluredir"
        raise pytest.UsageError(msg)
    path = Path(report_dir)
    expected = attempt.path / "allure-results"
    if not path.is_absolute() or not _is_real_directory(path):
        msg = "ALLURE_RESULTS_INVALID: result path must be a real absolute directory"
        raise pytest.UsageError(msg)
    if path != expected:
        msg = "ALLURE_RESULTS_INVALID: result path must match the preallocated attempt"
        raise pytest.UsageError(msg)
    return report_dir


def _replace_allure_file_logger(
    config: pytest.Config,
    guard: AllureSecretGuard,
    *,
    report_dir: str,
) -> None:
    manager = cast("_AllurePluginManager", allure_commons.plugin_manager)
    stock_loggers = tuple(
        plugin for plugin in manager.get_plugins() if isinstance(plugin, AllureFileLogger)
    )
    if len(stock_loggers) != 1:
        msg = "ALLURE_GUARD_REGISTRATION_FAILED: expected one Allure file logger"
        raise pytest.UsageError(msg)
    stock_logger = stock_loggers[0]
    stock_name = manager.get_name(stock_logger)
    if stock_name is None:
        msg = "ALLURE_GUARD_REGISTRATION_FAILED: Allure file logger is unnamed"
        raise pytest.UsageError(msg)
    manager.unregister(plugin=stock_logger)
    secure_logger = GuardedAllureFileLogger(
        report_dir,
        guard=guard,
    )
    secure_name = f"playwright-web-ui-allure-file-logger-{id(config)}"
    try:
        secure_registered = manager.register(secure_logger, name=secure_name)
    except Exception as error:
        manager.register(stock_logger, name=stock_name)
        msg = "ALLURE_GUARD_REGISTRATION_FAILED: reporting security guard is unavailable"
        raise pytest.UsageError(msg) from error
    if secure_registered is None:
        manager.register(stock_logger, name=stock_name)
        msg = "ALLURE_GUARD_REGISTRATION_FAILED: reporting security guard is unavailable"
        raise pytest.UsageError(msg)

    def restore_stock_logger() -> None:
        if manager.is_registered(secure_logger):
            manager.unregister(plugin=secure_logger)
        if not manager.is_registered(stock_logger):
            manager.register(stock_logger, name=stock_name)

    config.add_cleanup(restore_stock_logger)


def _sanitize_exception_info(
    excinfo: ExceptionInfo[BaseException],
    *,
    secret_values: tuple[str, ...],
) -> ExceptionInfo[BaseException]:
    summary = excinfo.exconly()
    rendered = f"{summary}\n{excinfo.getrepr(showlocals=False, style='short')}"
    sanitized = _redact_runtime_text(rendered, secret_values=secret_values)
    if sanitized == rendered:
        return excinfo
    safe_summary = _redact_runtime_text(summary, secret_values=secret_values)
    try:
        _raise_protected_failure(safe_summary)
    except AllureSecretError:
        return ExceptionInfo.from_current()


def _sanitize_test_report(
    report: TestReport,
    *,
    secret_values: tuple[str, ...],
) -> None:
    rendered = report.longreprtext
    sanitized = _redact_runtime_text(rendered, secret_values=secret_values)
    if sanitized != rendered:
        report.longrepr = sanitized
    report.sections[:] = [
        (
            _redact_runtime_text(name, secret_values=secret_values),
            _redact_runtime_text(content, secret_values=secret_values),
        )
        for name, content in report.sections
    ]


def _redact_runtime_text(value: str, *, secret_values: tuple[str, ...]) -> str:
    return redact_secret_text(
        value,
        secret_values=secret_values,
        limit=len(value) + 1,
    )


def _record_gate_errors(config: pytest.Config, errors: tuple[str, ...]) -> None:
    current = config.stash.get(_GATE_ERRORS_KEY, ())
    new_errors = tuple(error for error in errors if error not in current)
    config.stash[_GATE_ERRORS_KEY] = (*current, *new_errors)


def _raise_protected_failure(safe_summary: str) -> Never:
    msg = f"AUTOMATION_PROTECTED_FAILURE: {safe_summary}"
    raise AllureSecretError(msg)


def _forbidden_outcome_exception_info() -> ExceptionInfo[BaseException]:
    try:
        _raise_forbidden_outcome()
    except AssertionError:
        return ExceptionInfo.from_current()


def _raise_forbidden_outcome() -> Never:
    msg = "AUTOMATION_OUTCOME_FORBIDDEN: runtime skip/xfail outcomes are forbidden"
    raise AssertionError(msg)


def _is_real_directory(path: Path) -> bool:
    try:
        return path.resolve(strict=True) == path and not path.is_symlink() and path.is_dir()
    except OSError:
        return False
