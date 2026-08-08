from __future__ import annotations

import json
import os
from dataclasses import dataclass
from io import StringIO
from typing import TYPE_CHECKING

import pytest
from rich.console import Console

from playwright_web_ui.lifecycle import (
    ATTEMPT_NUMBER_ENV,
    ATTEMPT_PATH_ENV,
    WORKERS_ENV,
    LifecycleError,
    collect_execution,
    doctor_executor,
    run_execution,
    setup_executor,
)
from playwright_web_ui.platform_context import AUTH_COOKIE_ENV, PLATFORM_CONTEXT_ENV
from playwright_web_ui.suite import SuiteDefinition

from .test_platform_context import platform_context_payload

if TYPE_CHECKING:
    from collections.abc import Sequence
    from pathlib import Path

_NO_TESTS_COLLECTED = 5


@dataclass(frozen=True, slots=True)
class FakeEntryPoint:
    name: str
    value: str
    target: object

    def load(self) -> object:
        return self.target


@dataclass(frozen=True, slots=True)
class InspectingEntryPoint:
    name: str
    value: str
    target: object
    observed_inputs: list[tuple[str | None, str | None]]

    def load(self) -> object:
        self.observed_inputs.append(
            (
                os.environ.get(PLATFORM_CONTEXT_ENV),
                os.environ.get(AUTH_COOKIE_ENV),
            )
        )
        return self.target


def manifest_payload() -> dict[str, object]:
    return {
        "schema_version": 1,
        "logical_run_id": "20260808-1030-run-01",
        "execution_id": "execution-01",
        "project_id": "data-assets",
        "executor_id": "playwright-web-ui",
        "cases": [
            {
                "feature_id": "asset-catalog",
                "case_id": "C0001",
                "title": "Create an asset",
                "business_record": {"policy": "required"},
            }
        ],
    }


def execution_manifest(tmp_path: Path) -> Path:
    path = (
        tmp_path
        / "artifacts"
        / "runs"
        / "data-assets"
        / "20260808-1030-run-01"
        / "executions"
        / "playwright-web-ui"
        / "execution-01"
        / "execution-manifest.json"
    )
    path.parent.mkdir(parents=True)
    path.write_text(json.dumps(manifest_payload()), encoding="utf-8")
    return path


def suite_entry(tmp_path: Path) -> tuple[FakeEntryPoint, Path]:
    root = tmp_path / "suite"
    tests_path = root / "tests" / "e2e"
    tests_path.mkdir(parents=True)
    definition = SuiteDefinition(
        project_id="data-assets",
        root_path=root,
        tests_path=tests_path,
    )
    return FakeEntryPoint("data-assets", "suite:SUITE", definition), tests_path


def runtime_environ(attempt: Path, **extra: str) -> dict[str, str]:
    return {
        ATTEMPT_PATH_ENV: str(attempt),
        ATTEMPT_NUMBER_ENV: "1",
        PLATFORM_CONTEXT_ENV: json.dumps(platform_context_payload()),
        AUTH_COOKIE_ENV: "sid=synthetic-session-001; dt_tenant_name=synthetic-tenant",
        **extra,
    }


def test_collect_uses_exact_suite_and_manifest_without_attempt_mutation(tmp_path: Path) -> None:
    manifest = execution_manifest(tmp_path)
    entry, tests_path = suite_entry(tmp_path)
    calls: list[tuple[str, ...]] = []

    def run_pytest(arguments: Sequence[str]) -> int:
        calls.append(tuple(arguments))
        return 0

    result = collect_execution(manifest, entries=[entry], pytest_runner=run_pytest)

    assert result == 0
    assert calls == [
        (
            str(tests_path),
            "--collect-only",
            "--execution-manifest",
            str(manifest),
        )
    ]
    assert not (manifest.parent / "attempts").exists()


def test_collect_rejects_manifest_outside_canonical_artifact_layout(tmp_path: Path) -> None:
    path = tmp_path / "execution-manifest.json"
    path.write_text(json.dumps(manifest_payload()), encoding="utf-8")
    entry, _tests_path = suite_entry(tmp_path)

    with pytest.raises(LifecycleError, match="MANIFEST_PATH_INVALID"):
        collect_execution(path, entries=[entry], pytest_runner=lambda _arguments: 0)


def test_collect_reports_unknown_suite_before_pytest(tmp_path: Path) -> None:
    manifest = execution_manifest(tmp_path)

    with pytest.raises(LifecycleError, match=r"SUITE_NOT_FOUND.*data-assets"):
        collect_execution(manifest, entries=[], pytest_runner=lambda _arguments: 0)


def test_collect_removes_platform_secrets_before_loading_suite(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    manifest = execution_manifest(tmp_path)
    base_entry, _tests_path = suite_entry(tmp_path)
    observed_inputs: list[tuple[str | None, str | None]] = []
    entry = InspectingEntryPoint(
        name=base_entry.name,
        value=base_entry.value,
        target=base_entry.target,
        observed_inputs=observed_inputs,
    )
    monkeypatch.setenv(PLATFORM_CONTEXT_ENV, "synthetic-context-secret")
    monkeypatch.setenv(AUTH_COOKIE_ENV, "sid=synthetic-cookie-secret")

    result = collect_execution(
        manifest,
        entries=[entry],
        pytest_runner=lambda _arguments: 0,
    )

    assert result == 0
    assert observed_inputs == [(None, None)]


def test_collect_rejects_async_suite_source_before_pytest(tmp_path: Path) -> None:
    manifest = execution_manifest(tmp_path)
    entry, tests_path = suite_entry(tmp_path)
    async_source = tests_path.parent.parent / "src" / "invalid.py"
    async_source.parent.mkdir()
    async_source.write_text("from playwright.async_api import Page\n", encoding="utf-8")
    called = False

    def run_pytest(_arguments: Sequence[str]) -> int:
        nonlocal called
        called = True
        return 0

    with pytest.raises(LifecycleError, match="SYNC_API_ONLY"):
        collect_execution(manifest, entries=[entry], pytest_runner=run_pytest)

    assert not called


def test_run_requires_attempt_environment(tmp_path: Path) -> None:
    manifest = execution_manifest(tmp_path)
    entry, _tests_path = suite_entry(tmp_path)

    with pytest.raises(LifecycleError, match=f"ATTEMPT_ENV_MISSING.*{ATTEMPT_PATH_ENV}"):
        run_execution(
            manifest,
            entries=[entry],
            environ={},
            pytest_runner=lambda _arguments: 0,
        )


def test_run_rejects_attempt_path_outside_execution(tmp_path: Path) -> None:
    manifest = execution_manifest(tmp_path)
    entry, _tests_path = suite_entry(tmp_path)
    outside = tmp_path / "outside" / "001"
    outside.mkdir(parents=True)

    with pytest.raises(LifecycleError, match="ATTEMPT_PATH_OUTSIDE_EXECUTION"):
        run_execution(
            manifest,
            entries=[entry],
            environ={ATTEMPT_PATH_ENV: str(outside), ATTEMPT_NUMBER_ENV: "1"},
            pytest_runner=lambda _arguments: 0,
        )


def test_run_disables_unsafe_trace_and_configures_failure_evidence(
    tmp_path: Path,
) -> None:
    manifest = execution_manifest(tmp_path)
    entry, tests_path = suite_entry(tmp_path)
    attempt = manifest.parent / "attempts" / "001"
    attempt.mkdir(parents=True)
    calls: list[tuple[str, ...]] = []

    def run_pytest(arguments: Sequence[str]) -> int:
        calls.append(tuple(arguments))
        return 5

    result = run_execution(
        manifest,
        workers=2,
        entries=[entry],
        environ=runtime_environ(attempt),
        pytest_runner=run_pytest,
    )

    assert result == _NO_TESTS_COLLECTED
    assert calls == [
        (
            str(tests_path),
            "--execution-manifest",
            str(manifest),
            "--alluredir",
            str(attempt / "allure-results"),
            "--allure-no-capture",
            "--show-capture=no",
            "--output",
            str(attempt / "playwright-artifacts"),
            "--tracing",
            "off",
            "--screenshot",
            "only-on-failure",
            "--video",
            "retain-on-failure",
            "--browser",
            "chromium",
            "-n",
            "2",
        )
    ]
    assert (attempt / "allure-results").is_dir()
    assert (attempt / "evidence").is_dir()
    assert (attempt / "business-records").is_dir()
    assert (attempt / "playwright-artifacts").is_dir()


def test_run_consumes_platform_secrets_before_loading_suite_entry_point(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    manifest = execution_manifest(tmp_path)
    base_entry, _tests_path = suite_entry(tmp_path)
    attempt = manifest.parent / "attempts" / "001"
    attempt.mkdir(parents=True)
    for name, value in runtime_environ(attempt).items():
        monkeypatch.setenv(name, value)
    observed_inputs: list[tuple[str | None, str | None]] = []
    entry = InspectingEntryPoint(
        name=base_entry.name,
        value=base_entry.value,
        target=base_entry.target,
        observed_inputs=observed_inputs,
    )

    result = run_execution(
        manifest,
        entries=[entry],
        environ=os.environ,
        pytest_runner=lambda _arguments: 0,
    )

    assert result == 0
    assert observed_inputs == [(None, None)]
    assert PLATFORM_CONTEXT_ENV not in os.environ
    assert AUTH_COOKIE_ENV not in os.environ


def test_run_removes_platform_secrets_before_manifest_validation(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv(PLATFORM_CONTEXT_ENV, "synthetic-context-secret")
    monkeypatch.setenv(AUTH_COOKIE_ENV, "sid=synthetic-cookie-secret")

    with pytest.raises(LifecycleError, match="MANIFEST_PATH_INVALID"):
        run_execution(tmp_path / "not-canonical.json", environ=os.environ)

    assert PLATFORM_CONTEXT_ENV not in os.environ
    assert AUTH_COOKIE_ENV not in os.environ


def test_run_removes_invalid_cookie_before_reporting_validation_error(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    manifest = execution_manifest(tmp_path)
    attempt = manifest.parent / "attempts" / "001"
    attempt.mkdir(parents=True)
    runtime = runtime_environ(attempt)
    runtime[AUTH_COOKIE_ENV] = "sid=first; sid=synthetic-duplicate-secret"
    for name, value in runtime.items():
        monkeypatch.setenv(name, value)

    with pytest.raises(LifecycleError, match="AUTH_COOKIE_INVALID"):
        run_execution(manifest, environ=os.environ)

    assert PLATFORM_CONTEXT_ENV not in os.environ
    assert AUTH_COOKIE_ENV not in os.environ


def test_run_isolates_pytest_from_ambient_addopts(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    manifest = execution_manifest(tmp_path)
    entry, _tests_path = suite_entry(tmp_path)
    attempt = manifest.parent / "attempts" / "001"
    attempt.mkdir(parents=True)
    monkeypatch.setenv("PYTEST_ADDOPTS", "--collect-only")

    def fake_pytest_main(
        _arguments: Sequence[str],
        *,
        plugins: list[object] | None = None,
    ) -> int:
        assert "PYTEST_ADDOPTS" not in os.environ
        assert plugins is not None
        assert len(plugins) == 1
        return 0

    monkeypatch.setattr("playwright_web_ui.lifecycle.pytest.main", fake_pytest_main)

    result = run_execution(
        manifest,
        entries=[entry],
        environ=runtime_environ(attempt),
    )

    assert result == 0
    assert os.environ["PYTEST_ADDOPTS"] == "--collect-only"


def test_run_reads_workers_from_ephemeral_environment_when_argument_is_absent(
    tmp_path: Path,
) -> None:
    manifest = execution_manifest(tmp_path)
    entry, _tests_path = suite_entry(tmp_path)
    attempt = manifest.parent / "attempts" / "001"
    attempt.mkdir(parents=True)
    calls: list[tuple[str, ...]] = []

    def run_pytest(arguments: Sequence[str]) -> int:
        calls.append(tuple(arguments))
        return 0

    result = run_execution(
        manifest,
        entries=[entry],
        environ=runtime_environ(attempt, **{WORKERS_ENV: "3"}),
        pytest_runner=run_pytest,
    )

    assert result == 0
    assert calls[0][-2:] == ("-n", "3")


def test_run_explicit_workers_override_environment_value(tmp_path: Path) -> None:
    manifest = execution_manifest(tmp_path)
    entry, _tests_path = suite_entry(tmp_path)
    attempt = manifest.parent / "attempts" / "001"
    attempt.mkdir(parents=True)
    calls: list[tuple[str, ...]] = []

    def run_pytest(arguments: Sequence[str]) -> int:
        calls.append(tuple(arguments))
        return 0

    run_execution(
        manifest,
        workers=2,
        entries=[entry],
        environ=runtime_environ(attempt, **{WORKERS_ENV: "not-valid"}),
        pytest_runner=run_pytest,
    )

    assert calls[0][-2:] == ("-n", "2")


@pytest.mark.parametrize("configured", ["0", "auto", " 2", "2 ", ""])
def test_run_rejects_invalid_workers_environment(tmp_path: Path, configured: str) -> None:
    manifest = execution_manifest(tmp_path)
    entry, _tests_path = suite_entry(tmp_path)
    attempt = manifest.parent / "attempts" / "001"
    attempt.mkdir(parents=True)

    with pytest.raises(LifecycleError, match=f"WORKERS_INVALID.*{WORKERS_ENV}"):
        run_execution(
            manifest,
            entries=[entry],
            environ={
                ATTEMPT_PATH_ENV: str(attempt),
                ATTEMPT_NUMBER_ENV: "1",
                WORKERS_ENV: configured,
            },
            pytest_runner=lambda _arguments: 0,
        )


@pytest.mark.parametrize("workers", [0, -1, True])
def test_run_rejects_invalid_worker_count(tmp_path: Path, workers: int) -> None:
    manifest = execution_manifest(tmp_path)
    entry, _tests_path = suite_entry(tmp_path)
    attempt = manifest.parent / "attempts" / "001"
    attempt.mkdir(parents=True)

    with pytest.raises(LifecycleError, match="WORKERS_INVALID"):
        run_execution(
            manifest,
            workers=workers,
            entries=[entry],
            environ=runtime_environ(attempt),
            pytest_runner=lambda _arguments: 0,
        )


def test_run_refuses_to_reuse_an_attempt_artifact_directory(tmp_path: Path) -> None:
    manifest = execution_manifest(tmp_path)
    entry, _tests_path = suite_entry(tmp_path)
    attempt = manifest.parent / "attempts" / "001"
    (attempt / "evidence").mkdir(parents=True)

    with pytest.raises(LifecycleError, match="ATTEMPT_ALREADY_STARTED"):
        run_execution(
            manifest,
            entries=[entry],
            environ=runtime_environ(attempt),
            pytest_runner=lambda _arguments: 0,
        )


@pytest.mark.parametrize(
    ("missing", "code"),
    [
        (PLATFORM_CONTEXT_ENV, "PLATFORM_CONTEXT_ENV_MISSING"),
        (AUTH_COOKIE_ENV, "AUTH_COOKIE_ENV_MISSING"),
    ],
)
def test_run_rejects_missing_platform_input_before_creating_outputs(
    tmp_path: Path,
    missing: str,
    code: str,
) -> None:
    manifest = execution_manifest(tmp_path)
    entry, _tests_path = suite_entry(tmp_path)
    attempt = manifest.parent / "attempts" / "001"
    attempt.mkdir(parents=True)
    environ = runtime_environ(attempt)
    del environ[missing]

    with pytest.raises(LifecycleError, match=code):
        run_execution(
            manifest,
            entries=[entry],
            environ=environ,
            pytest_runner=lambda _arguments: 0,
        )

    assert list(attempt.iterdir()) == []


def test_setup_invokes_idempotent_chromium_install_with_current_python() -> None:
    calls: list[tuple[str, ...]] = []

    def run_command(arguments: Sequence[str]) -> int:
        calls.append(tuple(arguments))
        return 0

    assert setup_executor(command_runner=run_command) == 0
    assert len(calls) == 1
    assert calls[0][1:] == ("-m", "playwright", "install", "chromium")


def test_doctor_is_read_only_and_lists_registered_suites(
    tmp_path: Path,
    console_file: StringIO,
) -> None:
    entry, _tests_path = suite_entry(tmp_path)
    console = Console(file=console_file, color_system=None, width=120)

    assert doctor_executor(entries=[entry], console=console) == 0
    assert "data-assets" in console_file.getvalue()


@pytest.fixture
def console_file() -> StringIO:
    return StringIO()
