from __future__ import annotations

import json
import textwrap
from typing import TYPE_CHECKING, cast

import pytest

from .pytest_support import (
    ATTEMPT_PATH_ENV,
    AUTH_COOKIE_ENV,
    PLATFORM_CONTEXT_ENV,
    SYNTHETIC_AUTH_COOKIE,
    VALID_PNG,
    fake_page_source,
    manifest_payload,
    platform_context_payload,
    prepare_attempt,
    run_runtime,
    write_case,
    write_manifest,
)

if TYPE_CHECKING:
    from pathlib import Path

    from _pytest.pytester import RunResult

_BASE_URL = "https://synthetic.example.test"
_CONFLICTING_BASE_URL = "https://conflicting.example.test"
_COOKIE_VALUE = "synthetic-session-001"
_INJECTION_FAILURE = "browser rejected supplied authentication payload"
_EXPECTED_COOKIES = [
    {"name": "sid", "value": _COOKIE_VALUE, "url": f"{_BASE_URL}/"},
    {
        "name": "dt_tenant_name",
        "value": "synthetic-tenant",
        "url": f"{_BASE_URL}/",
    },
]


def _combined_output(result: RunResult) -> str:
    return f"{result.stdout.str()}\n{result.stderr.str()}"


def _assert_protected_values_absent(
    result: RunResult,
    attempt: Path,
    *values: str,
) -> None:
    output = _combined_output(result)
    artifact_bytes = b"".join(path.read_bytes() for path in attempt.rglob("*") if path.is_file())
    for value in values:
        assert value not in output
        assert value.encode() not in artifact_bytes


def _write_complete_runtime_case(pytester: pytest.Pytester) -> None:
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


def _fake_browser_fixtures_source(
    *,
    close_marker: Path | None = None,
    injection_failure: str | None = None,
) -> str:
    if injection_failure is None:
        add_cookies_body = """self.cookies = list(cookies)
EVENTS.append(("cookies", tuple(cookie["name"] for cookie in cookies)))"""
    else:
        add_cookies_body = f"raise RuntimeError({injection_failure!r})"
    close_marker_body = ""
    if close_marker is not None:
        close_marker_body = f'Path({str(close_marker)!r}).write_text("closed", encoding="utf-8")'
    source = textwrap.dedent(
        f"""
        from pathlib import Path

        import pytest

        EXPECTED_COOKIES = {_EXPECTED_COOKIES!r}
        VALID_PNG = {VALID_PNG!r}
        EVENTS = []

        class Body:
            def inner_text(self, **kwargs):
                return "Visible authenticated row"

        class FakePage:
            url = "{_BASE_URL}/rules"

            def __init__(self, context):
                self.context = context
                self.listeners = {{}}

            def title(self):
                return "Rules"

            def locator(self, selector):
                return Body()

            def screenshot(self, **kwargs):
                return VALID_PNG

            def on(self, event, callback):
                self.listeners.setdefault(event, []).append(callback)

            def remove_listener(self, event, callback):
                self.listeners[event].remove(callback)

        class FakeContext:
            def __init__(self):
                self.cookies = None
                self.closed = False
                self.events = EVENTS

            def add_cookies(self, cookies):
        __ADD_COOKIES__

            def new_page(self):
                assert self.cookies == EXPECTED_COOKIES
                EVENTS.append(("page", None))
                return FakePage(self)

            def close(self):
                self.closed = True
                EVENTS.append(("closed", None))
        __CLOSE_MARKER__

        @pytest.fixture
        def new_context():
            def create_context(**kwargs):
                EVENTS.append(("created", dict(kwargs)))
                return FakeContext()

            return create_context

        @pytest.fixture
        def context(new_context):
            return new_context()

        @pytest.fixture
        def page(context):
            return context.new_page()
        """
    )
    return source.replace(
        "__ADD_COOKIES__",
        textwrap.indent(add_cookies_body, "        "),
    ).replace(
        "__CLOSE_MARKER__",
        textwrap.indent(close_marker_body, "        "),
    )


def _authenticated_case_source(*, case_id: str, direct_context: bool = False) -> str:
    direct_context_body = ""
    parameters = "page, platform_context, step, business_records"
    if direct_context:
        parameters = f"{parameters}, new_context"
        direct_context_body = """extra_context = new_context(locale="en-US")
assert extra_context.cookies == {expected_cookies}
assert extra_context.events[-2][0] == "created"
assert extra_context.events[-1][0] == "cookies"
extra_context.close()"""
        direct_context_body = direct_context_body.format(expected_cookies=_EXPECTED_COOKIES)
    source = textwrap.dedent(
        f"""
        from playwright_web_ui import automation_case

        @automation_case(
            project_id="data-assets",
            feature_id="asset-catalog",
            case_id="{case_id}",
        )
        def test_case({parameters}):
            assert page.context.cookies == {_EXPECTED_COOKIES!r}
            assert [event[0] for event in page.context.events[:3]] == [
                "created", "cookies", "page"
            ]
            assert platform_context.env == "synthetic-dev"
            assert platform_context.urls.base_url == "{_BASE_URL}"
        __DIRECT_CONTEXT__
            with step(action="Read", expected="Visible", target="Rule list"):
                assert True
            business_records.record(
                record_type="data-quality-rule",
                record_id="rule-{case_id.lower()}",
                readback={{"name": "rule-{case_id.lower()}"}},
            )
        """
    )
    return source.replace(
        "__DIRECT_CONTEXT__",
        textwrap.indent(direct_context_body, "    "),
    )


def test_runtime_removes_platform_inputs_before_loading_initial_conftests(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    attempt = prepare_attempt(pytester, monkeypatch)
    pytester.makeconftest(
        f"""
import os
from pathlib import Path

assert {PLATFORM_CONTEXT_ENV!r} not in os.environ
assert {AUTH_COOKIE_ENV!r} not in os.environ
"""
    )
    _write_complete_runtime_case(pytester)

    result = run_runtime(pytester, manifest, attempt)

    result.assert_outcomes(passed=1)
    _assert_protected_values_absent(result, attempt, SYNTHETIC_AUTH_COOKIE, _COOKIE_VALUE)


def test_standalone_runtime_does_not_mistake_inherited_xdist_marker_for_worker(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    attempt = prepare_attempt(pytester, monkeypatch)
    monkeypatch.setenv("PYTEST_XDIST_WORKER", "inherited-gw0")
    _write_complete_runtime_case(pytester)

    result = run_runtime(pytester, manifest, attempt)

    result.assert_outcomes(passed=1)


def test_runtime_exposes_browser_context_arguments_as_read_only(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    attempt = prepare_attempt(pytester, monkeypatch)
    pytester.makeconftest(
        """
import pytest

@pytest.fixture(scope="session")
def browser_context_args():
    return {}

@pytest.fixture(autouse=True)
def verify_browser_context_args_are_read_only(browser_context_args):
    with pytest.raises(TypeError):
        browser_context_args["storage_state"] = "outside.json"
"""
    )
    _write_complete_runtime_case(pytester)

    result = run_runtime(pytester, manifest, attempt)

    result.assert_outcomes(passed=1)


@pytest.mark.parametrize(
    ("invalid_kind", "expected_code", "protected_value"),
    [
        (
            "context",
            "PLATFORM_CONTEXT_SECRET_FORBIDDEN",
            "raw-platform-secret-9081",
        ),
        ("cookie", "AUTH_COOKIE_INVALID", "raw-cookie-secret-9081"),
    ],
)
def test_invalid_platform_input_fails_before_suite_import_without_leaking(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
    invalid_kind: str,
    expected_code: str,
    protected_value: str,
) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    attempt = prepare_attempt(pytester, monkeypatch)
    if invalid_kind == "context":
        payload = platform_context_payload()
        payload["apiKey"] = protected_value
        monkeypatch.setenv(PLATFORM_CONTEXT_ENV, json.dumps(payload))
    else:
        monkeypatch.setenv(
            AUTH_COOKIE_ENV,
            f"sid={protected_value}; sid=duplicate-cookie",
        )
    import_marker = pytester.path / f"{invalid_kind}-conftest-imported"
    pytester.makeconftest(
        f"""
from pathlib import Path

Path({str(import_marker)!r}).write_text("imported", encoding="utf-8")
"""
    )
    _write_complete_runtime_case(pytester)

    result = run_runtime(pytester, manifest, attempt)

    assert result.ret == pytest.ExitCode.USAGE_ERROR
    assert expected_code in _combined_output(result)
    assert not import_marker.exists()
    _assert_protected_values_absent(result, attempt, protected_value)


def test_runtime_injects_base_url_and_exposes_typed_platform_context(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    attempt = prepare_attempt(pytester, monkeypatch)
    pytester.makepyfile(
        fake_page_source()
        + f"""
from playwright_web_ui import automation_case
from playwright_web_ui.platform_context import PlatformContext

@automation_case(
    project_id="data-assets",
    feature_id="asset-catalog",
    case_id="C0001",
)
def test_case(base_url, platform_context, step, business_records):
    assert base_url == {_BASE_URL!r}
    assert isinstance(platform_context, PlatformContext)
    assert platform_context.env == "synthetic-dev"
    assert platform_context.urls.assets_base_url == {_BASE_URL + "/dataAssets"!r}
    assert platform_context.datasources["primary"].metadata.id == 201
    assert platform_context.safety.allow_write is False
    with step(action="Read", expected="Visible", target="Rule list"):
        assert True
    business_records.record(
        record_type="data-quality-rule",
        record_id="rule-001",
        readback={{"name": "rule-001"}},
    )
"""
    )

    result = run_runtime(pytester, manifest, attempt)

    result.assert_outcomes(passed=1)


@pytest.mark.parametrize("conflict_source", ["command-line", "pytest-ini"])
def test_runtime_rejects_conflicting_base_url_configuration(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
    conflict_source: str,
) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    attempt = prepare_attempt(pytester, monkeypatch)
    write_case(pytester)
    extra_args: tuple[str, ...] = ()
    if conflict_source == "command-line":
        extra_args = ("--base-url", _CONFLICTING_BASE_URL)
    else:
        pytester.makeini(f"[pytest]\nbase_url = {_CONFLICTING_BASE_URL}\n")

    result = run_runtime(pytester, manifest, attempt, *extra_args)

    assert result.ret == pytest.ExitCode.USAGE_ERROR
    assert "PLATFORM_BASE_URL_CONFLICT" in _combined_output(result)


def test_new_context_injects_auth_cookies_before_returning_callback_result(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    attempt = prepare_attempt(pytester, monkeypatch)
    pytester.makepyfile(
        _fake_browser_fixtures_source()
        + _authenticated_case_source(case_id="C0001", direct_context=True)
    )

    result = run_runtime(pytester, manifest, attempt)

    result.assert_outcomes(passed=1)


@pytest.mark.parametrize(
    "override_kind",
    ["callback", "marker", "fixture"],
)
def test_runtime_rejects_browser_context_base_url_overrides(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
    override_kind: str,
) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    attempt = prepare_attempt(pytester, monkeypatch)
    fixture_override = ""
    marker = ""
    callback_override = ""
    if override_kind == "fixture":
        fixture_override = textwrap.dedent(
            f"""
            @pytest.fixture
            def browser_context_args():
                return {{"base_url": {_CONFLICTING_BASE_URL!r}}}

            @pytest.fixture
            def new_context(browser_context_args):
                def create_context(**kwargs):
                    return FakeContext()

                return create_context
            """
        )
    elif override_kind == "marker":
        marker = f"@pytest.mark.browser_context_args(base_url={_CONFLICTING_BASE_URL!r})\n"
    else:
        callback_override = f"new_context(base_url={_CONFLICTING_BASE_URL!r})"
    case_source = (
        "from playwright_web_ui import automation_case\n\n"
        + marker
        + textwrap.dedent(
            f"""
            @automation_case(
                project_id="data-assets",
                feature_id="asset-catalog",
                case_id="C0001",
            )
            def test_case(page, new_context):
                {callback_override or "assert page.context.cookies == EXPECTED_COOKIES"}
            """
        )
    )
    pytester.makepyfile(_fake_browser_fixtures_source() + fixture_override + case_source)

    result = run_runtime(pytester, manifest, attempt)

    assert result.ret != pytest.ExitCode.OK
    assert "PLATFORM_BASE_URL_CONFLICT" in _combined_output(result)


@pytest.mark.parametrize(
    "override_kind",
    ["callback-har", "marker-har", "fixture-video"],
)
def test_runtime_rejects_protected_browser_context_options(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
    override_kind: str,
) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    attempt = prepare_attempt(pytester, monkeypatch)
    outside = pytester.path / (
        "outside-video" if override_kind == "fixture-video" else "outside.har"
    )
    fixture_override = ""
    marker = ""
    callback_override = ""
    if override_kind == "fixture-video":
        fixture_override = textwrap.dedent(
            f"""
            @pytest.fixture
            def browser_context_args():
                return {{"record_video_dir": {str(outside)!r}}}

            @pytest.fixture
            def new_context(browser_context_args):
                def create_context(**kwargs):
                    return FakeContext()

                return create_context
            """
        )
    elif override_kind == "marker-har":
        marker = f"@pytest.mark.browser_context_args(record_har_path={str(outside)!r})\n"
    else:
        callback_override = f"new_context(record_har_path={str(outside)!r})"
    case_source = (
        "from playwright_web_ui import automation_case\n\n"
        + marker
        + textwrap.dedent(
            f"""
            @automation_case(
                project_id="data-assets",
                feature_id="asset-catalog",
                case_id="C0001",
            )
            def test_case(page, new_context):
                {callback_override or "assert page.context.cookies == EXPECTED_COOKIES"}
            """
        )
    )
    pytester.makepyfile(_fake_browser_fixtures_source() + fixture_override + case_source)

    result = run_runtime(pytester, manifest, attempt)

    assert result.ret != pytest.ExitCode.OK
    assert "PLAYWRIGHT_CONTEXT_OPTION_FORBIDDEN" in _combined_output(result)
    assert not outside.exists()


def test_new_context_closes_context_and_redacts_injection_failure(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    attempt = prepare_attempt(pytester, monkeypatch)
    close_marker = pytester.path / "failed-context-closed"
    original_failure = f"{_INJECTION_FAILURE}: {_COOKIE_VALUE}"
    pytester.makepyfile(
        _fake_browser_fixtures_source(
            close_marker=close_marker,
            injection_failure=original_failure,
        )
        + _authenticated_case_source(case_id="C0001")
    )

    result = run_runtime(pytester, manifest, attempt)

    assert result.ret != pytest.ExitCode.OK
    assert "AUTH_COOKIE_INJECTION_FAILED" in _combined_output(result)
    assert close_marker.read_text(encoding="utf-8") == "closed"
    _assert_protected_values_absent(
        result,
        attempt,
        _COOKIE_VALUE,
        _INJECTION_FAILURE,
        original_failure,
    )


@pytest.mark.parametrize("tracing", ["on", "retain-on-failure"])
def test_runtime_rejects_playwright_tracing(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
    tracing: str,
) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    attempt = prepare_attempt(pytester, monkeypatch)
    write_case(pytester)

    result = run_runtime(pytester, manifest, attempt, "--tracing", tracing)

    assert result.ret == pytest.ExitCode.USAGE_ERROR
    assert "PLAYWRIGHT_TRACING_FORBIDDEN" in _combined_output(result)


def test_collect_only_without_attempt_does_not_require_platform_inputs(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    write_case(pytester)
    monkeypatch.delenv(ATTEMPT_PATH_ENV, raising=False)
    monkeypatch.delenv(PLATFORM_CONTEXT_ENV, raising=False)
    monkeypatch.delenv(AUTH_COOKIE_ENV, raising=False)

    result = pytester.runpytest_subprocess(
        "--execution-manifest",
        str(manifest),
        "--collect-only",
    )

    assert result.ret == pytest.ExitCode.OK
    result.stdout.fnmatch_lines(["*1 test collected*"])


def test_attempt_runtime_rejects_collect_only_from_pytest_addopts(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    attempt = prepare_attempt(pytester, monkeypatch)
    monkeypatch.setenv("PYTEST_ADDOPTS", "--collect-only")
    _write_complete_runtime_case(pytester)

    result = run_runtime(pytester, manifest, attempt)

    assert result.ret == pytest.ExitCode.USAGE_ERROR
    assert "AUTOMATION_RUN_MODE_INVALID" in _combined_output(result)


def test_plain_pytest_without_manifest_leaves_platform_environment_untouched(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    raw_context = "not-json-and-not-runtime"
    raw_cookie = "not-a-cookie-and-not-runtime"
    monkeypatch.setenv(PLATFORM_CONTEXT_ENV, raw_context)
    monkeypatch.setenv(AUTH_COOKIE_ENV, raw_cookie)
    pytester.makeconftest(
        f"""
import os

assert os.environ[{PLATFORM_CONTEXT_ENV!r}] == {raw_context!r}
assert os.environ[{AUTH_COOKIE_ENV!r}] == {raw_cookie!r}
"""
    )
    pytester.makepyfile(
        f"""
import os

def test_plain_pytest():
    assert os.environ[{PLATFORM_CONTEXT_ENV!r}] == {raw_context!r}
    assert os.environ[{AUTH_COOKIE_ENV!r}] == {raw_cookie!r}
"""
    )

    result = pytester.runpytest_subprocess()

    result.assert_outcomes(passed=1)


def test_xdist_workers_receive_platform_context_and_inject_auth_cookies(
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
            "effects": {"platform_write": False},
            "business_record": {"policy": "required"},
        }
    )
    manifest = write_manifest(pytester, payload)
    attempt = prepare_attempt(pytester, monkeypatch)
    pytester.makeconftest(
        f"""
import os

assert {PLATFORM_CONTEXT_ENV!r} not in os.environ
assert {AUTH_COOKIE_ENV!r} not in os.environ

def pytest_configure(config):
    worker_input = getattr(config, "workerinput", None)
    if worker_input is not None:
        assert "playwright_web_ui_platform_context" not in worker_input
        assert "playwright_web_ui_auth_cookie" not in worker_input

def pytest_sessionstart(session):
    worker_input = getattr(session.config, "workerinput", None)
    if worker_input is not None:
        output = Path(session.config.getoption("output"))
        assert output.parent.name == "playwright-artifacts"
        assert output.name == worker_input["workerid"]
"""
        + _fake_browser_fixtures_source()
    )
    for case_id in ("C0001", "C0002"):
        pytester.makepyfile(
            **{
                f"test_{case_id.lower()}": _authenticated_case_source(case_id=case_id),
            }
        )

    result = run_runtime(pytester, manifest, attempt, "-n", "2")

    result.assert_outcomes(passed=2)
