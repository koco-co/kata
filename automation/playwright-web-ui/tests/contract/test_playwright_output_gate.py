"""Black-box contracts for pytest-playwright's destructive output directory."""

from __future__ import annotations

import pytest

from .pytest_support import (
    fake_page_source,
    manifest_payload,
    prepare_attempt,
    run_runtime,
    write_case,
    write_manifest,
)


def test_runtime_rejects_external_playwright_output_before_deletion(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    attempt = prepare_attempt(pytester, monkeypatch)
    outside = pytester.path / "outside-playwright-output"
    outside.mkdir()
    sentinel = outside / "keep.txt"
    sentinel.write_text("keep", encoding="utf-8")
    conftest_marker = pytester.path / "conftest-imported"
    pytester.makeconftest(
        f"""
from pathlib import Path

Path({str(conftest_marker)!r}).write_text("imported", encoding="utf-8")
"""
    )
    write_case(pytester)

    result = pytester.runpytest_subprocess(
        "--execution-manifest",
        str(manifest),
        "--alluredir",
        str(attempt / "allure-results"),
        "--output",
        str(outside),
    )

    assert result.ret == pytest.ExitCode.USAGE_ERROR
    assert "PLAYWRIGHT_OUTPUT_INVALID" in result.stderr.str()
    assert sentinel.read_text(encoding="utf-8") == "keep"
    assert not conftest_marker.exists()


def test_runtime_rejects_symlinked_playwright_output_without_touching_target(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    attempt = prepare_attempt(pytester, monkeypatch)
    outside = pytester.path / "outside-playwright-output"
    outside.mkdir()
    sentinel = outside / "keep.txt"
    sentinel.write_text("keep", encoding="utf-8")
    output = attempt / "playwright-artifacts"
    output.rmdir()
    output.symlink_to(outside, target_is_directory=True)
    write_case(pytester)

    result = pytester.runpytest_subprocess(
        "--execution-manifest",
        str(manifest),
        "--alluredir",
        str(attempt / "allure-results"),
        "--output",
        str(output),
    )

    assert result.ret == pytest.ExitCode.USAGE_ERROR
    assert "ATTEMPT_RUNTIME_INVALID" in result.stderr.str()
    assert sentinel.read_text(encoding="utf-8") == "keep"


def test_canonical_playwright_cleanup_never_deletes_structured_evidence(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    attempt = prepare_attempt(pytester, monkeypatch)
    sentinel = attempt / "evidence" / "keep.txt"
    sentinel.write_text("keep", encoding="utf-8")
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

    result = run_runtime(pytester, manifest, attempt)

    result.assert_outcomes(passed=1)
    assert sentinel.read_text(encoding="utf-8") == "keep"


@pytest.mark.parametrize(
    ("mutation", "expected_code"),
    [
        ("session.config.option.output = __OUTSIDE__", "PLAYWRIGHT_OUTPUT_INVALID"),
        ("session.config.option.tracing = 'on'", "PLAYWRIGHT_TRACING_FORBIDDEN"),
    ],
)
def test_runtime_rejects_session_hook_runtime_rewrite_before_cleanup(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
    mutation: str,
    expected_code: str,
) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    attempt = prepare_attempt(pytester, monkeypatch)
    outside = pytester.path / "outside-playwright-output"
    outside.mkdir()
    sentinel = outside / "keep.txt"
    sentinel.write_text("keep", encoding="utf-8")
    hook_body = mutation.replace("__OUTSIDE__", repr(str(outside)))
    pytester.makeconftest(
        f"""
def pytest_sessionstart(session):
    {hook_body}
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

    result = run_runtime(pytester, manifest, attempt)

    assert result.ret == pytest.ExitCode.TESTS_FAILED
    assert expected_code in f"{result.stdout.str()}\n{result.stderr.str()}"
    assert sentinel.read_text(encoding="utf-8") == "keep"
