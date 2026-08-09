"""Testable lifecycle operations for the synchronous Playwright executor."""

from __future__ import annotations

import os
import re
import subprocess
import sys
from collections.abc import MutableMapping
from dataclasses import dataclass
from importlib import metadata
from pathlib import Path
from typing import TYPE_CHECKING

import pytest
from rich.console import Console
from rich.table import Table

from playwright_web_ui.manifest import ExecutionManifest, ManifestError, load_execution_manifest
from playwright_web_ui.platform_context import (
    AUTH_COOKIE_ENV,
    PLATFORM_CONTEXT_ENV,
    PlatformContextError,
    PlatformEnvironment,
    load_platform_environment,
)
from playwright_web_ui.pytest_plugin import RuntimeEnvironmentBootstrap
from playwright_web_ui.source_policy import (
    SourcePolicyError,
    validate_controlled_browser_sources,
    validate_sync_only_sources,
)
from playwright_web_ui.suite import (
    SuiteDefinition,
    SuiteEntryPoint,
    SuiteRegistryError,
    discover_suites,
    load_suite,
)

if TYPE_CHECKING:
    from collections.abc import Callable, Mapping, Sequence

ATTEMPT_PATH_ENV = "AUTOMATION_ATTEMPT_PATH"
ATTEMPT_NUMBER_ENV = "AUTOMATION_ATTEMPT_NUMBER"
WORKERS_ENV = "AUTOMATION_WORKERS"
EXECUTOR_ID = "playwright-web-ui"
_ATTEMPT_NUMBER_RE = re.compile(r"^[1-9][0-9]*$")
_RUNTIME_DISTRIBUTIONS = (
    "playwright-web-ui",
    "playwright",
    "pytest",
    "pytest-playwright",
    "pytest-xdist",
    "allure-pytest",
)
_ATTEMPT_ALREADY_STARTED = "ATTEMPT_ALREADY_STARTED"
_ATTEMPT_ENV_INVALID = "ATTEMPT_ENV_INVALID"
_ATTEMPT_ENV_MISSING = "ATTEMPT_ENV_MISSING"
_ATTEMPT_PATH_INVALID = "ATTEMPT_PATH_INVALID"
_ATTEMPT_PATH_OUTSIDE_EXECUTION = "ATTEMPT_PATH_OUTSIDE_EXECUTION"
_DOCTOR_DEPENDENCY_MISSING = "DOCTOR_DEPENDENCY_MISSING"
_MANIFEST_EXECUTOR_MISMATCH = "MANIFEST_EXECUTOR_MISMATCH"
_MANIFEST_INVALID = "MANIFEST_INVALID"
_MANIFEST_PATH_INVALID = "MANIFEST_PATH_INVALID"
_PATH_NOT_FOUND = "PATH_NOT_FOUND"
_PATH_UNSAFE = "PATH_UNSAFE"
_PLATFORM_WRITE_FORBIDDEN = "PLATFORM_WRITE_FORBIDDEN"
_SETUP_BROWSER_INSTALL_FAILED = "SETUP_BROWSER_INSTALL_FAILED"
_WORKERS_INVALID = "WORKERS_INVALID"
_WORKERS_MESSAGE = "workers must be a positive integer"

type PytestRunner = Callable[[Sequence[str]], int]
type CommandRunner = Callable[[Sequence[str]], int]


class LifecycleError(RuntimeError):
    """Raised when a lifecycle precondition or invariant is violated."""

    exit_code = 2

    def __init__(self, code: str, message: str) -> None:
        """Initialize a stable code and human-readable diagnostic."""
        self.code = code
        super().__init__(f"{code}: {message}")


@dataclass(frozen=True, slots=True)
class ManifestContext:
    """Validated manifest and its canonical execution directory."""

    path: Path
    execution_path: Path
    manifest: ExecutionManifest


@dataclass(frozen=True, slots=True)
class AttemptContext:
    """Validated immutable attempt allocation and output locations."""

    number: int
    path: Path
    allure_results: Path
    evidence: Path
    business_records: Path
    playwright_artifacts: Path


def setup_executor(*, command_runner: CommandRunner | None = None) -> int:
    """Install the pinned Chromium runtime; repeated Playwright installs are idempotent."""
    _remove_platform_secret_environment()
    runner = command_runner or _run_command
    arguments = (sys.executable, "-m", "playwright", "install", "chromium")
    result = runner(arguments)
    if result != 0:
        raise LifecycleError(
            _SETUP_BROWSER_INSTALL_FAILED,
            f"Chromium installation returned exit code {result}",
        )
    return 0


def doctor_executor(
    *,
    entries: Sequence[SuiteEntryPoint] | None = None,
    console: Console | None = None,
) -> int:
    """Inspect local packages and suite registrations without browser or network access."""
    _remove_platform_secret_environment()
    suites = _discover_suites(entries)
    _validate_sync_policy(suites)
    versions: list[tuple[str, str]] = []
    for distribution in _RUNTIME_DISTRIBUTIONS:
        try:
            versions.append((distribution, metadata.version(distribution)))
        except metadata.PackageNotFoundError as error:
            raise LifecycleError(
                _DOCTOR_DEPENDENCY_MISSING,
                f"required distribution is not installed: {distribution}",
            ) from error
    output = console or Console()
    output.print("[bold]playwright-web-ui doctor[/bold]")
    package_table = Table(title="Locked runtime", show_header=True)
    package_table.add_column("Distribution")
    package_table.add_column("Version")
    for distribution, version in versions:
        package_table.add_row(distribution, version)
    output.print(package_table)
    suite_table = Table(title="Registered suites", show_header=True)
    suite_table.add_column("Project")
    suite_table.add_column("Tests")
    for suite in suites:
        suite_table.add_row(suite.project_id, str(suite.tests_path))
    output.print(suite_table)
    return 0


def collect_execution(
    execution_manifest: str | Path,
    *,
    entries: Sequence[SuiteEntryPoint] | None = None,
    pytest_runner: PytestRunner | None = None,
) -> int:
    """Collect exactly the suite selected by a manifest without running fixtures."""
    _remove_platform_secret_environment()
    context = _manifest_context(execution_manifest)
    suite = _load_suite(context.manifest.project_id, entries)
    _validate_sync_policy((suite,))
    arguments = (
        str(suite.tests_path),
        "--collect-only",
        "--execution-manifest",
        str(context.path),
    )
    return (pytest_runner or _run_pytest)(arguments)


def run_execution(
    execution_manifest: str | Path,
    *,
    workers: int | None = None,
    entries: Sequence[SuiteEntryPoint] | None = None,
    environ: Mapping[str, str] | None = None,
    pytest_runner: PytestRunner | None = None,
) -> int:
    """Run one immutable attempt with explicit failure-retention settings."""
    runtime_environment = os.environ if environ is None else environ
    platform_inputs = _capture_platform_inputs(runtime_environment)
    effective_workers = _resolve_workers(workers, runtime_environment)
    context = _manifest_context(execution_manifest)
    attempt = _attempt_context(context, runtime_environment)
    try:
        platform_environment = load_platform_environment(platform_inputs)
    except PlatformContextError as error:
        raise LifecycleError(error.code, error.detail) from error
    _validate_platform_write(context.manifest, platform_environment)
    suite = _load_suite(context.manifest.project_id, entries)
    _validate_sync_policy((suite,))
    _prepare_attempt_outputs(attempt)

    arguments = [
        str(suite.tests_path),
        "--execution-manifest",
        str(context.path),
        "--alluredir",
        str(attempt.allure_results),
        "--allure-no-capture",
        "--show-capture=no",
        "--output",
        str(attempt.playwright_artifacts),
        "--tracing",
        "off",
        "--screenshot",
        "only-on-failure",
        "--video",
        "retain-on-failure",
        "--browser",
        "chromium",
    ]
    if effective_workers is not None:
        arguments.extend(("-n", str(effective_workers)))
    if pytest_runner is not None:
        return pytest_runner(arguments)
    return _run_pytest(arguments, platform_environment=platform_environment)


def _manifest_context(execution_manifest: str | Path) -> ManifestContext:
    path = Path(execution_manifest)
    if not path.is_absolute():
        raise LifecycleError(_MANIFEST_PATH_INVALID, f"path must be absolute: {path}")
    if path.name != "execution-manifest.json":
        raise LifecycleError(
            _MANIFEST_PATH_INVALID,
            f"file must be named execution-manifest.json: {path}",
        )
    path = _existing_real_path(path, field="execution manifest", directory=False)
    try:
        manifest = load_execution_manifest(path)
    except ManifestError as error:
        raise LifecycleError(_MANIFEST_INVALID, str(error)) from error
    if manifest.executor_id != EXECUTOR_ID:
        raise LifecycleError(
            _MANIFEST_EXECUTOR_MISMATCH,
            f"expected {EXECUTOR_ID}, got {manifest.executor_id}",
        )

    execution_path = path.parent
    executor_path = execution_path.parent
    executions_path = executor_path.parent
    logical_run_path = executions_path.parent
    project_path = logical_run_path.parent
    runs_path = project_path.parent
    artifacts_path = runs_path.parent
    expected_names = (
        (execution_path.name, manifest.execution_id, "execution_id"),
        (executor_path.name, manifest.executor_id, "executor_id"),
        (executions_path.name, "executions", "executions directory"),
        (logical_run_path.name, manifest.logical_run_id, "logical_run_id"),
        (project_path.name, manifest.project_id, "project_id"),
        (runs_path.name, "runs", "runs directory"),
        (artifacts_path.name, "artifacts", "artifacts directory"),
    )
    for actual, expected, field in expected_names:
        if actual != expected:
            raise LifecycleError(
                _MANIFEST_PATH_INVALID,
                f"{field} path segment must be {expected}, got {actual}",
            )
    return ManifestContext(path=path, execution_path=execution_path, manifest=manifest)


def _attempt_context(
    manifest: ManifestContext,
    environ: Mapping[str, str],
) -> AttemptContext:
    raw_path = environ.get(ATTEMPT_PATH_ENV)
    raw_number = environ.get(ATTEMPT_NUMBER_ENV)
    missing = [
        name
        for name, value in ((ATTEMPT_PATH_ENV, raw_path), (ATTEMPT_NUMBER_ENV, raw_number))
        if value is None or value == ""
    ]
    if missing:
        raise LifecycleError(
            _ATTEMPT_ENV_MISSING,
            f"required environment variables: {', '.join(missing)}",
        )
    if raw_path is None or raw_number is None:
        raise LifecycleError(_ATTEMPT_ENV_MISSING, "attempt environment is incomplete")
    if raw_path != raw_path.strip() or not _ATTEMPT_NUMBER_RE.fullmatch(raw_number):
        raise LifecycleError(
            _ATTEMPT_ENV_INVALID,
            "attempt path must be trimmed and attempt number must be a positive integer",
        )
    number = int(raw_number)
    path = Path(raw_path)
    if not path.is_absolute():
        raise LifecycleError(_ATTEMPT_PATH_INVALID, f"path must be absolute: {path}")
    path = _existing_real_path(path, field="attempt path", directory=True)
    expected = manifest.execution_path / "attempts" / str(number).zfill(3)
    if path != expected:
        raise LifecycleError(
            _ATTEMPT_PATH_OUTSIDE_EXECUTION,
            f"expected {expected}, got {path}",
        )
    return AttemptContext(
        number=number,
        path=path,
        allure_results=path / "allure-results",
        evidence=path / "evidence",
        business_records=path / "business-records",
        playwright_artifacts=path / "playwright-artifacts",
    )


def _prepare_attempt_outputs(attempt: AttemptContext) -> None:
    outputs = (
        attempt.allure_results,
        attempt.evidence,
        attempt.business_records,
        attempt.playwright_artifacts,
    )
    existing = [path for path in outputs if os.path.lexists(path)]
    if existing:
        raise LifecycleError(
            _ATTEMPT_ALREADY_STARTED,
            f"attempt output already exists: {existing[0]}",
        )
    for path in outputs:
        path.mkdir()


def _resolve_workers(workers: int | None, environ: Mapping[str, str]) -> int | None:
    if workers is not None:
        if isinstance(workers, bool) or workers < 1:
            raise LifecycleError(_WORKERS_INVALID, _WORKERS_MESSAGE)
        return workers
    configured = environ.get(WORKERS_ENV)
    if configured is None:
        return None
    if not _ATTEMPT_NUMBER_RE.fullmatch(configured):
        raise LifecycleError(_WORKERS_INVALID, f"{WORKERS_ENV} must be a positive integer")
    return int(configured)


def _existing_real_path(path: Path, *, field: str, directory: bool) -> Path:
    try:
        resolved = path.resolve(strict=True)
    except OSError as error:
        raise LifecycleError(_PATH_NOT_FOUND, f"{field} does not exist: {path}") from error
    expected_type = resolved.is_dir() if directory else resolved.is_file()
    if resolved != path or path.is_symlink() or not expected_type:
        raise LifecycleError(
            _PATH_UNSAFE,
            f"{field} must be a real {'directory' if directory else 'file'}: {path}",
        )
    return resolved


def _load_suite(
    project_id: str,
    entries: Sequence[SuiteEntryPoint] | None,
) -> SuiteDefinition:
    try:
        return load_suite(project_id, entries=entries)
    except SuiteRegistryError as error:
        raise LifecycleError(error.code, error.detail) from error


def _discover_suites(
    entries: Sequence[SuiteEntryPoint] | None,
) -> tuple[SuiteDefinition, ...]:
    try:
        return discover_suites(entries=entries)
    except SuiteRegistryError as error:
        raise LifecycleError(error.code, error.detail) from error


def _validate_sync_policy(suites: Sequence[SuiteDefinition]) -> None:
    roots = (Path(__file__).resolve().parent, *(suite.root_path for suite in suites))
    try:
        validate_sync_only_sources(roots)
        validate_controlled_browser_sources(tuple(suite.root_path for suite in suites))
    except SourcePolicyError as error:
        raise LifecycleError(error.code, error.detail) from error


def _run_pytest(
    arguments: Sequence[str],
    *,
    platform_environment: PlatformEnvironment | None = None,
) -> int:
    addopts_was_set = "PYTEST_ADDOPTS" in os.environ
    ambient_addopts = os.environ.pop("PYTEST_ADDOPTS", None)
    bootstrap = None
    plugins: list[object] | None = None
    if platform_environment is not None:
        bootstrap = RuntimeEnvironmentBootstrap(platform_environment)
        plugins = [bootstrap]
    try:
        return int(pytest.main(list(arguments), plugins=plugins))
    finally:
        if bootstrap is not None:
            bootstrap.clear()
        if addopts_was_set and ambient_addopts is not None:
            os.environ["PYTEST_ADDOPTS"] = ambient_addopts
        else:
            os.environ.pop("PYTEST_ADDOPTS", None)


def _remove_platform_secret_environment() -> None:
    os.environ.pop(PLATFORM_CONTEXT_ENV, None)
    os.environ.pop(AUTH_COOKIE_ENV, None)


def _capture_platform_inputs(environment: Mapping[str, str]) -> dict[str, str]:
    captured = {
        name: value
        for name in (PLATFORM_CONTEXT_ENV, AUTH_COOKIE_ENV)
        if (value := environment.get(name)) is not None
    }
    if isinstance(environment, MutableMapping):
        environment.pop(PLATFORM_CONTEXT_ENV, None)
        environment.pop(AUTH_COOKIE_ENV, None)
    _remove_platform_secret_environment()
    return captured


def _validate_platform_write(
    manifest: ExecutionManifest,
    platform_environment: PlatformEnvironment,
) -> None:
    if platform_environment.context.safety.allow_write:
        return
    if any(selected_case.effects.platform_write for selected_case in manifest.cases):
        raise LifecycleError(
            _PLATFORM_WRITE_FORBIDDEN,
            "execution requires platform writes but the environment does not allow them",
        )


def _run_command(arguments: Sequence[str]) -> int:
    # The only production caller supplies a fixed current-Python Playwright install argv.
    completed = subprocess.run(list(arguments), check=False)  # noqa: S603
    return completed.returncode
