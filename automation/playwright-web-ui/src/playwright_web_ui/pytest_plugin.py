"""Pytest collection gate for immutable Playwright Web UI executions."""

from __future__ import annotations

import os
from collections import defaultdict
from pathlib import Path
from typing import TYPE_CHECKING, Never, Protocol, cast

import allure
import pytest
from _pytest._code.code import ExceptionInfo
from allure_commons.types import AttachmentType

from playwright_web_ui.allure_guard import (
    AllureSecretError,
    AllureSecretGuard,
    install_guarded_allure_logger,
)
from playwright_web_ui.allure_identity import apply_canonical_case_labels
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
from playwright_web_ui.platform_context import (
    AUTH_COOKIE_ENV,
    PLATFORM_CONTEXT_ENV,
    PlatformContext,
    PlatformContextError,
    PlatformEnvironment,
    load_platform_environment,
    serialize_platform_context,
)
from playwright_web_ui.pytest_browser_runtime import (
    authenticated_fixture_result,
    raise_base_url_conflict,
)
from playwright_web_ui.pytest_runtime_paths import (
    ATTEMPT_PATH_ENV,
    AttemptRuntime,
    load_attempt_runtime,
    raise_attempt_runtime_missing_for_allure,
    reject_clean_alluredir,
    validate_active_playwright_output_path,
    validate_allure_results_path,
    validate_initial_runtime_outputs,
    validate_playwright_output_path,
    xdist_worker_output_path,
)
from playwright_web_ui.runtime_identity import AutomationRuntimeIdentity, RuntimeIdentityError

if TYPE_CHECKING:
    from collections.abc import Generator, Iterator

    from _pytest.fixtures import FixtureDef
    from _pytest.reports import TestReport
    from _pytest.runner import CallInfo
    from _pytest.terminal import TerminalReporter
    from playwright.sync_api import Page

EXECUTOR_ID = "playwright-web-ui"
_OPTION_DEST = "execution_manifest"
_MANIFEST_KEY: pytest.StashKey[ExecutionManifest] = pytest.StashKey()
_CASES_KEY: pytest.StashKey[dict[CaseKey, AutomationCase]] = pytest.StashKey()
_ATTEMPT_KEY: pytest.StashKey[AttemptRuntime] = pytest.StashKey()
_ITEM_CASE_KEY: pytest.StashKey[CaseKey] = pytest.StashKey()
_FAILED_REPORT_KEY: pytest.StashKey[TestReport] = pytest.StashKey()
_RECORDER_KEY: pytest.StashKey[EvidenceRecorder] = pytest.StashKey()
_GATE_ERRORS_KEY: pytest.StashKey[tuple[str, ...]] = pytest.StashKey()
_PLATFORM_ENV_KEY: pytest.StashKey[PlatformEnvironment] = pytest.StashKey()
_ALLURE_GUARD_KEY: pytest.StashKey[AllureSecretGuard] = pytest.StashKey()
_XDIST_SECRET_BREACH_KEY: pytest.StashKey[bool] = pytest.StashKey()
_XDIST_AUTH_COOKIE_INPUT = "playwright_web_ui_auth_cookie"
_XDIST_PLATFORM_CONTEXT_INPUT = "playwright_web_ui_platform_context"
_XDIST_BREACH_OUTPUT = "playwright_web_ui_report_breach"


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


class StepFixture(Protocol):
    """Strict callable contract for the structured step fixture."""

    def __call__(self, *, action: str, expected: str, target: str) -> StepContext:
        """Create one keyword-only structured checkpoint context."""
        ...


class RuntimeEnvironmentBootstrap:
    """Transfer one parsed lifecycle environment into pytest without process env secrets."""

    def __init__(self, environment: PlatformEnvironment) -> None:
        """Hold the environment only until pytest's earliest initialization hook."""
        self._environment: PlatformEnvironment | None = environment

    @pytest.hookimpl(tryfirst=True)
    def pytest_load_initial_conftests(
        self,
        early_config: pytest.Config,
        parser: pytest.Parser,
        args: list[str],
    ) -> None:
        """Move the environment to a private config stash before conftest imports."""
        del parser, args
        environment = self._environment
        if environment is None:
            msg = "PLATFORM_CONTEXT_HANDOFF_INVALID: runtime environment was already consumed"
            raise pytest.UsageError(msg)
        early_config.stash[_PLATFORM_ENV_KEY] = environment
        self._environment = None

    def clear(self) -> None:
        """Drop an unconsumed environment after an aborted pytest startup."""
        self._environment = None


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
    context_text = os.environ.pop(PLATFORM_CONTEXT_ENV, None)
    cookie_text = os.environ.pop(AUTH_COOKIE_ENV, None)
    worker_input = cast(
        "dict[str, object] | None",
        getattr(early_config, "workerinput", None),
    )
    if worker_input is not None:
        context_text = worker_input.pop(_XDIST_PLATFORM_CONTEXT_INPUT, None)
        cookie_text = worker_input.pop(_XDIST_AUTH_COOKIE_INPUT, None)
    validate_initial_runtime_outputs(early_config)
    if os.environ.get(ATTEMPT_PATH_ENV) is not None and bool(
        getattr(namespace, "collectonly", False)
    ):
        _raise_invalid_attempt_run_mode()
    has_environment_transport = context_text is not None or cookie_text is not None
    if os.environ.get(ATTEMPT_PATH_ENV) is not None and has_environment_transport:
        early_config.stash[_PLATFORM_ENV_KEY] = _parse_platform_environment(
            context_text,
            cookie_text,
        )


@pytest.hookimpl(wrapper=True, tryfirst=True)
def pytest_cmdline_main(
    config: pytest.Config,
) -> Generator[None, int | pytest.ExitCode | None, int | pytest.ExitCode | None]:
    """Remove worker transport secrets before any pytest configure hook runs."""
    manifest_option = cast("str | None", config.getoption(_OPTION_DEST, default=None))
    worker_input = cast(
        "dict[str, object] | None",
        getattr(config, "workerinput", None),
    )
    if manifest_option is not None and worker_input is not None:
        context_text = worker_input.pop(_XDIST_PLATFORM_CONTEXT_INPUT, None)
        cookie_text = worker_input.pop(_XDIST_AUTH_COOKIE_INPUT, None)
        if os.environ.get(ATTEMPT_PATH_ENV) is not None:
            config.stash[_PLATFORM_ENV_KEY] = _parse_platform_environment(
                context_text,
                cookie_text,
            )
    return (yield)


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
    clean_alluredir = cast(
        "bool",
        config.getoption("clean_alluredir", default=False),
    )
    reject_clean_alluredir(clean_alluredir=clean_alluredir)
    report_dir = cast(
        "str | None",
        config.getoption("allure_report_dir", default=None),
    )
    attempt = load_attempt_runtime()
    if report_dir is not None and attempt is None:
        raise_attempt_runtime_missing_for_allure()
    collect_only = cast("bool", config.getoption("collectonly", default=False))
    if attempt is not None and collect_only:
        _raise_invalid_attempt_run_mode()
    if attempt is None and not collect_only:
        msg = f"ATTEMPT_RUNTIME_MISSING: {ATTEMPT_PATH_ENV} is required for execution"
        raise pytest.UsageError(msg)
    if attempt is not None:
        environment = _runtime_platform_environment(config)
        config.stash[_PLATFORM_ENV_KEY] = environment
        _configure_browser_runtime(config, environment)
        validate_playwright_output_path(
            cast("str | None", config.getoption("output", default=None)),
            attempt,
        )
        config.stash[_ATTEMPT_KEY] = attempt
        report_dir = validate_allure_results_path(report_dir, attempt)
        guard = AllureSecretGuard(secret_values=_secret_values(config))
        install_guarded_allure_logger(
            config,
            guard,
            report_dir=report_dir,
        )
        config.stash[_ALLURE_GUARD_KEY] = guard


@pytest.hookimpl(optionalhook=True)
def pytest_configure_node(node: _XdistNode) -> None:
    """Transfer the protected auth context directly to an xdist worker."""
    environment = node.config.stash.get(_PLATFORM_ENV_KEY, None)
    if environment is None:
        return
    node.workerinput[_XDIST_PLATFORM_CONTEXT_INPUT] = serialize_platform_context(
        environment.context,
    )
    node.workerinput[_XDIST_AUTH_COOKIE_INPUT] = environment.auth_cookie.header


@pytest.hookimpl(wrapper=True, trylast=True)
def pytest_fixture_setup(
    fixturedef: FixtureDef[object],
    request: pytest.FixtureRequest,
) -> Generator[None, object, object]:
    """Authenticate every context created through pytest-playwright's factory."""
    environment = request.config.stash.get(_PLATFORM_ENV_KEY, None)
    attempt = request.config.stash.get(_ATTEMPT_KEY, None)
    if environment is not None and attempt is not None:
        _revalidate_browser_runtime(request.config, environment, attempt)
    result = yield
    if environment is None or attempt is None:
        return result
    return authenticated_fixture_result(fixturedef, request, result, environment)


@pytest.hookimpl(tryfirst=True)
def pytest_sessionstart(session: pytest.Session) -> None:
    """Give every xdist worker its own destructible Playwright output directory."""
    attempt = session.config.stash.get(_ATTEMPT_KEY, None)
    worker_input = cast(
        "dict[str, object] | None",
        getattr(session.config, "workerinput", None),
    )
    if attempt is None or worker_input is None:
        return
    session.config.option.output = str(xdist_worker_output_path(worker_input, attempt))


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


@pytest.hookimpl(wrapper=True, tryfirst=True)
def pytest_runtest_setup(item: pytest.Item) -> Generator[None]:
    """Label canonical results before setup and reject dynamic outcome control."""
    key = item.stash.get(_ITEM_CASE_KEY, None)
    cases = item.config.stash.get(_CASES_KEY, None)
    if key is not None and cases is not None:
        apply_canonical_case_labels(cases[key].key)

    yield

    runtime_active = item.config.stash.get(_ATTEMPT_KEY, None) is not None
    canonical_item = key is not None
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


@pytest.fixture
def automation_identity(request: pytest.FixtureRequest) -> AutomationRuntimeIdentity:
    """Expose the selected case's immutable, non-secret execution identity."""
    selected_case, attempt = _fixture_context(request)
    manifest = request.config.stash.get(_MANIFEST_KEY, None)
    if manifest is None:
        message = "RUNTIME_IDENTITY_MISSING: execution manifest was not initialized"
        raise pytest.UsageError(message)
    worker_input = cast(
        "dict[str, object] | None",
        getattr(request.config, "workerinput", None),
    )
    worker_id = "serial" if worker_input is None else worker_input.get("workerid")
    if not isinstance(worker_id, str) or not attempt.path.name.isdigit():
        message = "RUNTIME_IDENTITY_INVALID: runtime worker or attempt is invalid"
        raise pytest.UsageError(message)
    try:
        return AutomationRuntimeIdentity(
            case=selected_case.key,
            logical_run_id=manifest.logical_run_id,
            execution_id=manifest.execution_id,
            executor_id=manifest.executor_id,
            attempt=int(attempt.path.name),
            worker_id=worker_id,
        )
    except RuntimeIdentityError as error:
        raise pytest.UsageError(str(error)) from error


@pytest.fixture(name="platform_context")
def platform_context_fixture(request: pytest.FixtureRequest) -> PlatformContext:
    """Expose the validated non-secret platform context to runtime suites."""
    environment = request.config.stash.get(_PLATFORM_ENV_KEY, None)
    attempt = request.config.stash.get(_ATTEMPT_KEY, None)
    if environment is None or attempt is None:
        msg = "PLATFORM_CONTEXT_RUNTIME_MISSING: fixture requires an executable attempt"
        raise pytest.UsageError(msg)
    return environment.context


@pytest.hookimpl(wrapper=True, trylast=True)
def pytest_sessionfinish(
    session: pytest.Session,
    exitstatus: int | pytest.ExitCode,
) -> Generator[None]:
    """Gate controller success on durable evidence from every manifest case."""
    del exitstatus
    yield
    effective_exitstatus = session.exitstatus
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
        if effective_exitstatus == pytest.ExitCode.OK:
            session.exitstatus = pytest.ExitCode.TESTS_FAILED
    if hasattr(config, "workerinput") or config.getoption("collectonly", default=False):
        return
    if effective_exitstatus not in (pytest.ExitCode.OK, pytest.ExitCode.TESTS_FAILED):
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
    environment = config.stash.get(_PLATFORM_ENV_KEY, None)
    return () if environment is None else environment.secret_fragments


def _runtime_platform_environment(config: pytest.Config) -> PlatformEnvironment:
    environment = config.stash.get(_PLATFORM_ENV_KEY, None)
    if environment is None:
        msg = "PLATFORM_CONTEXT_ENV_MISSING: runtime platform context was not initialized"
        raise pytest.UsageError(msg)
    return environment


def _parse_platform_environment(
    context_text: object | None,
    cookie_text: object | None,
) -> PlatformEnvironment:
    environ: dict[str, str] = {}
    if context_text is not None:
        if not isinstance(context_text, str):
            msg = "PLATFORM_CONTEXT_TRANSPORT_INVALID: platform context must be text"
            raise pytest.UsageError(msg)
        environ[PLATFORM_CONTEXT_ENV] = context_text
    if cookie_text is not None:
        if not isinstance(cookie_text, str):
            msg = "PLATFORM_CONTEXT_TRANSPORT_INVALID: auth cookie must be text"
            raise pytest.UsageError(msg)
        environ[AUTH_COOKIE_ENV] = cookie_text
    try:
        return load_platform_environment(environ)
    except PlatformContextError as error:
        raise pytest.UsageError(str(error)) from None


def _configure_browser_runtime(
    config: pytest.Config,
    environment: PlatformEnvironment,
) -> None:
    tracing = cast("str | None", config.getoption("tracing", default=None))
    if tracing != "off":
        msg = "PLAYWRIGHT_TRACING_FORBIDDEN: authenticated runtime requires tracing=off"
        raise pytest.UsageError(msg)
    expected = environment.context.urls.base_url
    configured = cast("str | None", config.getoption("base_url", default=None))
    configured_ini = cast("str", config.getini("base_url"))
    for candidate in (configured, configured_ini):
        if candidate and candidate != expected:
            raise_base_url_conflict()
    config.option.base_url = expected


def _revalidate_browser_runtime(
    config: pytest.Config,
    environment: PlatformEnvironment,
    attempt: AttemptRuntime,
) -> None:
    _configure_browser_runtime(config, environment)
    worker_input = cast(
        "dict[str, object] | None",
        getattr(config, "workerinput", None),
    )
    validate_active_playwright_output_path(
        cast("str | None", config.getoption("output", default=None)),
        attempt,
        worker_input,
    )


def _raise_invalid_attempt_run_mode() -> Never:
    msg = "AUTOMATION_RUN_MODE_INVALID: an allocated attempt cannot use collect-only mode"
    raise pytest.UsageError(msg)


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
