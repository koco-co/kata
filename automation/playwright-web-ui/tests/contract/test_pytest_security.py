from __future__ import annotations

import json
from typing import Protocol, cast

import pytest

from playwright_web_ui.platform_context import (
    AUTH_COOKIE_ENV,
    PLATFORM_CONTEXT_ENV,
)
from playwright_web_ui.pytest_plugin import pytest_testnodedown
from playwright_web_ui.pytest_runtime_paths import ATTEMPT_PATH_ENV

from .pytest_support import (
    SYNTHETIC_AUTH_COOKIE,
    fake_page_source,
    manifest_payload,
    platform_context_payload,
    prepare_attempt,
    runtime_output_args,
    write_manifest,
)

_SYNTHETIC_COOKIE = "sid=synthetic-cookie-value"


class _NodeDownHook(Protocol):
    def __call__(self, node: object, error: object | None) -> None: ...


class _CrashedNode:
    def __init__(self, config: pytest.Config) -> None:
        self.config = config


class _DummyPlaywrightOptions:
    @staticmethod
    def pytest_addoption(parser: pytest.Parser) -> None:
        group = parser.getgroup("dummy-playwright-options")
        group.addoption("--output", default="test-results")
        group.addoption("--tracing", default="off")


def test_runtime_removes_auth_cookie_from_environment_before_collection(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    attempt = prepare_attempt(pytester, monkeypatch)
    monkeypatch.setenv(AUTH_COOKIE_ENV, _SYNTHETIC_COOKIE)
    pytester.makeconftest(
        f"""
import os

assert {AUTH_COOKIE_ENV!r} not in os.environ
"""
    )
    pytester.makepyfile(
        fake_page_source()
        + f"""
import os

from playwright_web_ui import automation_case

@automation_case(
    project_id="data-assets",
    feature_id="asset-catalog",
    case_id="C0001",
)
def test_case(step, business_records):
    assert {AUTH_COOKIE_ENV!r} not in os.environ
    with step(action="Read", expected="Visible", target="Rule list"):
        assert True
    business_records.record(
        record_type="data-quality-rule",
        record_id="rule-001",
        readback={{"name": "rule-001"}},
    )
"""
    )

    result = pytester.runpytest_subprocess(
        "--execution-manifest",
        str(manifest),
        "--alluredir",
        str(attempt / "allure-results"),
        "--allure-no-capture",
        "--show-capture=no",
        *runtime_output_args(attempt),
    )

    result.assert_outcomes(passed=1)
    for path in attempt.rglob("*"):
        if path.is_file():
            assert _SYNTHETIC_COOKIE.encode() not in path.read_bytes()


def test_xdist_workers_remove_auth_cookie_before_collecting_suite_code(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    payload = manifest_payload()
    cases = cast("list[dict[str, object]]", payload["cases"])
    cases.append(
        {
            "feature_id": "asset-catalog",
            "case_id": "C0002",
            "title": "Create another asset",
            "business_record": {"policy": "required"},
        }
    )
    manifest = write_manifest(pytester, payload)
    attempt = prepare_attempt(pytester, monkeypatch)
    monkeypatch.setenv(AUTH_COOKIE_ENV, _SYNTHETIC_COOKIE)
    pytester.makeconftest(
        f"""
import os

assert {AUTH_COOKIE_ENV!r} not in os.environ
"""
    )
    for case_id in ("C0001", "C0002"):
        pytester.makepyfile(
            **{
                f"test_{case_id.lower()}": fake_page_source()
                + f"""
import os

from playwright_web_ui import automation_case

@automation_case(
    project_id="data-assets",
    feature_id="asset-catalog",
    case_id="{case_id}",
)
def test_case(step, business_records):
    assert {AUTH_COOKIE_ENV!r} not in os.environ
    with step(action="Read", expected="Visible", target="Rule list"):
        assert True
    business_records.record(
        record_type="data-quality-rule",
        record_id="rule-{case_id}",
        readback={{"name": "rule-{case_id}"}},
    )
"""
            }
        )

    result = pytester.runpytest_subprocess(
        "--execution-manifest",
        str(manifest),
        "--alluredir",
        str(attempt / "allure-results"),
        "--allure-no-capture",
        "--show-capture=no",
        *runtime_output_args(attempt),
        "-n",
        "2",
    )

    result.assert_outcomes(passed=2)


def test_xdist_crashed_node_without_workeroutput_does_not_mask_original_error(
    pytestconfig: pytest.Config,
) -> None:
    hook = cast("_NodeDownHook", pytest_testnodedown)

    hook(_CrashedNode(pytestconfig), RuntimeError("synthetic worker crash"))


@pytest.mark.parametrize(
    "runner_args",
    [(), ("-n", "2")],
    ids=["serial", "xdist"],
)
def test_allure_results_redact_known_cookie_from_failure_details(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
    runner_args: tuple[str, ...],
) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    attempt = prepare_attempt(pytester, monkeypatch)
    monkeypatch.setenv(AUTH_COOKIE_ENV, _SYNTHETIC_COOKIE)
    pytester.makepyfile(
        fake_page_source()
        + f"""
from playwright_web_ui import automation_case

@automation_case(
    project_id="data-assets",
    feature_id="asset-catalog",
    case_id="C0001",
)
def test_case():
    raise RuntimeError("authentication failed: {_SYNTHETIC_COOKIE}")
"""
    )

    result = pytester.runpytest_subprocess(
        "--execution-manifest",
        str(manifest),
        "--alluredir",
        str(attempt / "allure-results"),
        "--allure-no-capture",
        "--show-capture=no",
        *runtime_output_args(attempt),
        *runner_args,
    )

    assert result.ret == pytest.ExitCode.TESTS_FAILED
    artifact_bytes = b"".join(path.read_bytes() for path in attempt.rglob("*") if path.is_file())
    assert _SYNTHETIC_COOKIE.encode() not in artifact_bytes
    assert b"[REDACTED]" in artifact_bytes
    assert _SYNTHETIC_COOKIE not in result.stdout.str()
    assert _SYNTHETIC_COOKIE not in result.stderr.str()


def test_allure_guard_blocks_direct_secret_attachment_before_file_write(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    attempt = prepare_attempt(pytester, monkeypatch)
    monkeypatch.setenv(AUTH_COOKIE_ENV, _SYNTHETIC_COOKIE)
    pytester.makepyfile(
        fake_page_source()
        + f"""
import allure

from playwright_web_ui import automation_case

@automation_case(
    project_id="data-assets",
    feature_id="asset-catalog",
    case_id="C0001",
)
def test_case(step, business_records):
    with step(action="Read", expected="Visible", target="Rule list"):
        assert True
    business_records.record(
        record_type="data-quality-rule",
        record_id="rule-001",
        readback={{"name": "rule-001"}},
    )
    allure.attach("{_SYNTHETIC_COOKIE}", name="unsafe")
"""
    )

    result = pytester.runpytest_subprocess(
        "--execution-manifest",
        str(manifest),
        "--alluredir",
        str(attempt / "allure-results"),
        "--allure-no-capture",
        "--show-capture=no",
        *runtime_output_args(attempt),
    )

    assert result.ret == pytest.ExitCode.TESTS_FAILED
    assert "ALLURE_SECRET_FORBIDDEN" in result.stdout.str()
    attachments = list((attempt / "allure-results").glob("*-attachment.*"))
    assert any(path.read_bytes() == b"[REDACTED]" for path in attachments)
    for path in attempt.rglob("*"):
        if path.is_file():
            assert _SYNTHETIC_COOKIE.encode() not in path.read_bytes()
    assert _SYNTHETIC_COOKIE not in result.stdout.str()
    assert _SYNTHETIC_COOKIE not in result.stderr.str()


def test_allure_guard_blocks_hook_attachment_without_pytest_internal_error(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    attempt = prepare_attempt(pytester, monkeypatch)
    monkeypatch.setenv(AUTH_COOKIE_ENV, _SYNTHETIC_COOKIE)
    pytester.makeconftest(
        f"""
import allure

def pytest_runtest_logreport(report):
    if report.when == "call":
        allure.attach("{_SYNTHETIC_COOKIE}", name="unsafe-hook")
"""
    )
    pytester.makepyfile(
        fake_page_source()
        + """
from playwright_web_ui import automation_case

@automation_case(
    project_id="data-assets",
    feature_id="asset-catalog",
    case_id="C0001",
)
def test_case(step, business_records):
    with step(action="Read", expected="Visible", target="Rule list"):
        assert True
    business_records.record(
        record_type="data-quality-rule",
        record_id="rule-001",
        readback={"name": "rule-001"},
    )
"""
    )

    result = pytester.runpytest_subprocess(
        "--execution-manifest",
        str(manifest),
        "--alluredir",
        str(attempt / "allure-results"),
        "--allure-no-capture",
        "--show-capture=no",
        *runtime_output_args(attempt),
    )

    assert result.ret == pytest.ExitCode.TESTS_FAILED
    combined_output = f"{result.stdout.str()}\n{result.stderr.str()}"
    assert "INTERNALERROR" not in combined_output
    assert "ALLURE_SECRET_FORBIDDEN" in combined_output
    assert _SYNTHETIC_COOKIE not in combined_output
    for path in attempt.rglob("*"):
        if path.is_file():
            assert _SYNTHETIC_COOKIE.encode() not in path.read_bytes()


def test_allure_guard_fails_breach_created_by_late_sessionfinish_hook(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    attempt = prepare_attempt(pytester, monkeypatch)
    monkeypatch.setenv(AUTH_COOKIE_ENV, _SYNTHETIC_COOKIE)
    pytester.makeconftest(
        f"""
import allure_commons
import pytest

@pytest.hookimpl(trylast=True)
def pytest_sessionfinish(session, exitstatus):
    allure_commons.plugin_manager.hook.report_attached_data(
        body="{_SYNTHETIC_COOKIE}",
        file_name="unsafe-sessionfinish.txt",
    )
"""
    )
    pytester.makepyfile(
        fake_page_source()
        + """
from playwright_web_ui import automation_case

@automation_case(
    project_id="data-assets",
    feature_id="asset-catalog",
    case_id="C0001",
)
def test_case(step, business_records):
    with step(action="Read", expected="Visible", target="Rule list"):
        assert True
    business_records.record(
        record_type="data-quality-rule",
        record_id="rule-001",
        readback={"name": "rule-001"},
    )
"""
    )

    result = pytester.runpytest_subprocess(
        "--execution-manifest",
        str(manifest),
        "--alluredir",
        str(attempt / "allure-results"),
        "--allure-no-capture",
        "--show-capture=no",
        *runtime_output_args(attempt),
    )

    assert result.ret == pytest.ExitCode.TESTS_FAILED
    combined_output = f"{result.stdout.str()}\n{result.stderr.str()}"
    assert "ALLURE_SECRET_FORBIDDEN" in combined_output
    assert _SYNTHETIC_COOKIE not in combined_output
    for path in attempt.rglob("*"):
        if path.is_file():
            assert _SYNTHETIC_COOKIE.encode() not in path.read_bytes()


def test_reporting_breach_does_not_downgrade_pytest_internal_error(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    attempt = prepare_attempt(pytester, monkeypatch)
    pytester.makeconftest(
        """
import allure

def pytest_runtest_logreport(report):
    if report.when == "call":
        allure.attach("apiKey=unsafe", name="unsafe-hook")
        raise RuntimeError("synthetic hook crash")
"""
    )
    pytester.makepyfile(
        fake_page_source()
        + """
from playwright_web_ui import automation_case

@automation_case(
    project_id="data-assets",
    feature_id="asset-catalog",
    case_id="C0001",
)
def test_case(step, business_records):
    with step(action="Read", expected="Visible", target="Rule list"):
        assert True
    business_records.record(
        record_type="data-quality-rule",
        record_id="rule-001",
        readback={"name": "rule-001"},
    )
"""
    )

    result = pytester.runpytest_subprocess(
        "--execution-manifest",
        str(manifest),
        "--alluredir",
        str(attempt / "allure-results"),
        "--allure-no-capture",
        "--show-capture=no",
        *runtime_output_args(attempt),
    )

    assert result.ret == pytest.ExitCode.INTERNAL_ERROR


def test_secure_allure_logger_cleanup_allows_consecutive_in_process_runs(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    pytester.makepyfile(
        fake_page_source()
        + """
from playwright_web_ui import automation_case

@automation_case(
    project_id="data-assets",
    feature_id="asset-catalog",
    case_id="C0001",
)
def test_case(step, business_records):
    with step(action="Read", expected="Visible", target="Rule list"):
        assert True
    business_records.record(
        record_type="data-quality-rule",
        record_id="rule-001",
        readback={"name": "rule-001"},
    )
"""
    )

    for number in (1, 2):
        attempt = pytester.path / "attempts" / f"{number:03d}"
        for name in (
            "allure-results",
            "evidence",
            "business-records",
            "playwright-artifacts",
        ):
            (attempt / name).mkdir(parents=True)
        monkeypatch.setenv(ATTEMPT_PATH_ENV, str(attempt))
        monkeypatch.setenv(PLATFORM_CONTEXT_ENV, json.dumps(platform_context_payload()))
        monkeypatch.setenv(AUTH_COOKIE_ENV, SYNTHETIC_AUTH_COOKIE)
        result = pytester.runpytest(
            "--execution-manifest",
            str(manifest),
            "--alluredir",
            str(attempt / "allure-results"),
            "--allure-no-capture",
            "--show-capture=no",
            *runtime_output_args(attempt),
            "-p",
            "no:playwright",
            plugins=[_DummyPlaywrightOptions()],
        )

        result.assert_outcomes(passed=1)


@pytest.mark.parametrize(
    "runner_args",
    [(), ("-n", "2")],
    ids=["serial", "xdist"],
)
def test_allure_guard_redacts_sensitive_parameter_and_fails_passing_run(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
    runner_args: tuple[str, ...],
) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    attempt = prepare_attempt(pytester, monkeypatch)
    monkeypatch.setenv(AUTH_COOKIE_ENV, _SYNTHETIC_COOKIE)
    pytester.makepyfile(
        fake_page_source()
        + f"""
import pytest

from playwright_web_ui import automation_case

@pytest.mark.parametrize("apiKey", ["{_SYNTHETIC_COOKIE}"])
@automation_case(
    project_id="data-assets",
    feature_id="asset-catalog",
    case_id="C0001",
)
def test_case(apiKey, step, business_records):
    assert apiKey
    with step(action="Read", expected="Visible", target="Rule list"):
        assert True
    business_records.record(
        record_type="data-quality-rule",
        record_id="rule-001",
        readback={{"name": "rule-001"}},
    )
"""
    )

    result = pytester.runpytest_subprocess(
        "--execution-manifest",
        str(manifest),
        "--alluredir",
        str(attempt / "allure-results"),
        "--allure-no-capture",
        "--show-capture=no",
        *runtime_output_args(attempt),
        *runner_args,
    )

    assert result.ret == pytest.ExitCode.TESTS_FAILED
    artifact_bytes = b"".join(path.read_bytes() for path in attempt.rglob("*") if path.is_file())
    assert _SYNTHETIC_COOKIE.encode() not in artifact_bytes
    assert b"[REDACTED]" in artifact_bytes


@pytest.mark.parametrize(
    "unsafe_fixture",
    [
        """
@pytest.fixture
def protected_runtime_fixture():
    raise RuntimeError("setup failed: __SECRET__")
""",
        """
@pytest.fixture
def protected_runtime_fixture():
    yield
    raise RuntimeError("finalizer failed: __SECRET__")
""",
    ],
    ids=["setup", "finalizer"],
)
def test_allure_guard_redacts_fixture_failures_before_container_write(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
    unsafe_fixture: str,
) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    attempt = prepare_attempt(pytester, monkeypatch)
    monkeypatch.setenv(AUTH_COOKIE_ENV, _SYNTHETIC_COOKIE)
    fixture_source = unsafe_fixture.replace("__SECRET__", _SYNTHETIC_COOKIE)
    pytester.makepyfile(
        fake_page_source()
        + fixture_source
        + """
from playwright_web_ui import automation_case

@automation_case(
    project_id="data-assets",
    feature_id="asset-catalog",
    case_id="C0001",
)
def test_case(protected_runtime_fixture, step, business_records):
    with step(action="Read", expected="Visible", target="Rule list"):
        assert True
    business_records.record(
        record_type="data-quality-rule",
        record_id="rule-001",
        readback={"name": "rule-001"},
    )
"""
    )

    result = pytester.runpytest_subprocess(
        "--execution-manifest",
        str(manifest),
        "--alluredir",
        str(attempt / "allure-results"),
        "--allure-no-capture",
        "--show-capture=no",
        *runtime_output_args(attempt),
    )

    assert result.ret == pytest.ExitCode.TESTS_FAILED
    artifact_bytes = b"".join(path.read_bytes() for path in attempt.rglob("*") if path.is_file())
    assert _SYNTHETIC_COOKIE.encode() not in artifact_bytes
    assert _SYNTHETIC_COOKIE not in result.stdout.str()
    assert _SYNTHETIC_COOKIE not in result.stderr.str()
