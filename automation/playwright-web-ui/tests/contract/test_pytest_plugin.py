from __future__ import annotations

import json
from typing import cast

import pytest

from .pytest_support import (
    fake_page_source,
    manifest_payload,
    prepare_attempt,
    run_runtime,
    runtime_output_args,
    write_case,
    write_manifest,
)

_XDIST_CASE_COUNT = 2


def _write_successful_runtime_case(pytester: pytest.Pytester) -> None:
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


def test_plugin_accepts_exact_manifest_to_collection_mapping(pytester: pytest.Pytester) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    write_case(pytester)

    result = pytester.runpytest(
        "--execution-manifest",
        str(manifest),
        "--collect-only",
    )

    assert result.ret == pytest.ExitCode.OK
    result.stdout.fnmatch_lines(["*1 test collected*"])


def test_plugin_accepts_parametrized_items_with_distinct_canonical_markers(
    pytester: pytest.Pytester,
) -> None:
    payload = manifest_payload()
    cases = cast("list[dict[str, object]]", payload["cases"])
    cases.append(
        {
            "feature_id": "asset-catalog",
            "case_id": "C0002",
            "title": "Read an asset",
            "effects": {"platform_write": False},
            "business_record": {
                "policy": "not_applicable",
                "reason": "Read-only validation.",
            },
        }
    )
    manifest = write_manifest(pytester, payload)
    pytester.makepyfile(
        """
        import pytest

        from playwright_web_ui import automation_case

        SCENARIOS = (
            pytest.param(
                "create",
                id="C0001",
                marks=automation_case(
                    project_id="data-assets",
                    feature_id="asset-catalog",
                    case_id="C0001",
                ),
            ),
            pytest.param(
                "read",
                id="C0002",
                marks=automation_case(
                    project_id="data-assets",
                    feature_id="asset-catalog",
                    case_id="C0002",
                ),
            ),
        )

        @pytest.mark.parametrize("scenario", SCENARIOS)
        def test_case(scenario):
            assert scenario in {"create", "read"}
        """
    )

    result = pytester.runpytest(
        "--execution-manifest",
        str(manifest),
        "--collect-only",
    )

    assert result.ret == pytest.ExitCode.OK
    result.stdout.fnmatch_lines(["*2 tests collected*"])


def test_collect_only_validates_page_case_without_starting_browser(
    pytester: pytest.Pytester,
) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    pytester.makepyfile(
        """
        import pytest

        from playwright_web_ui import automation_case

        @pytest.fixture
        def page():
            raise AssertionError("collect-only must not execute fixtures")

        @automation_case(
            project_id="data-assets",
            feature_id="asset-catalog",
            case_id="C0001",
        )
        def test_case(page):
            pass
        """
    )

    result = pytester.runpytest(
        "--execution-manifest",
        str(manifest),
        "--collect-only",
    )

    assert result.ret == pytest.ExitCode.OK
    result.stdout.fnmatch_lines(["*1 test collected*"])


def test_plugin_rejects_execution_without_preallocated_attempt(
    pytester: pytest.Pytester,
) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    write_case(pytester)

    result = pytester.runpytest_subprocess("--execution-manifest", str(manifest))

    assert result.ret == pytest.ExitCode.USAGE_ERROR
    result.stderr.fnmatch_lines(["*ATTEMPT_RUNTIME_MISSING*AUTOMATION_ATTEMPT_PATH*"])


def test_plugin_deselects_valid_canonical_case_outside_manifest_during_collection(
    pytester: pytest.Pytester,
) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    write_case(pytester)
    pytester.makepyfile(
        test_other="""
        from playwright_web_ui import automation_case

        @automation_case(
            project_id="data-assets",
            feature_id="other-feature",
            case_id="C0002",
        )
        def test_other():
            pass
        """
    )

    result = pytester.runpytest(
        "--execution-manifest",
        str(manifest),
        "--collect-only",
    )

    assert result.ret == pytest.ExitCode.OK
    result.stdout.fnmatch_lines(["*1/2 tests collected (1 deselected)*"])


def test_plugin_deselects_valid_canonical_case_outside_manifest_during_run(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    attempt = prepare_attempt(pytester, monkeypatch)
    _write_successful_runtime_case(pytester)
    pytester.makepyfile(
        test_other="""
        from playwright_web_ui import automation_case

        @automation_case(
            project_id="data-assets",
            feature_id="other-feature",
            case_id="C0002",
        )
        def test_other():
            raise AssertionError("manifest-external case must be deselected")
        """
    )

    result = run_runtime(pytester, manifest, attempt)

    result.assert_outcomes(passed=1, deselected=1)


def test_plugin_applies_the_same_manifest_selection_on_xdist_workers(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    attempt = prepare_attempt(pytester, monkeypatch)
    _write_successful_runtime_case(pytester)
    pytester.makepyfile(
        test_other="""
        from playwright_web_ui import automation_case

        @automation_case(
            project_id="data-assets",
            feature_id="other-feature",
            case_id="C0002",
        )
        def test_other():
            raise AssertionError("manifest-external case must be deselected")
        """
    )

    result = run_runtime(pytester, manifest, attempt, "-n", "2")

    result.assert_outcomes(passed=1)
    assert "2 workers [1 item]" in result.stdout.lines


def test_plugin_rejects_unmarked_item_even_when_it_is_outside_manifest(
    pytester: pytest.Pytester,
) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    write_case(pytester)
    pytester.makepyfile(
        test_unmarked="""
        def test_unmarked():
            pass
        """
    )

    result = pytester.runpytest(
        "--execution-manifest",
        str(manifest),
        "--collect-only",
    )

    assert result.ret == pytest.ExitCode.USAGE_ERROR
    result.stderr.fnmatch_lines(["*expected exactly one automation_case marker*"])


def test_plugin_rejects_missing_manifest_case(pytester: pytest.Pytester) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    write_case(pytester, case="C0002")

    result = pytester.runpytest(
        "--execution-manifest",
        str(manifest),
        "--collect-only",
    )

    assert result.ret == pytest.ExitCode.USAGE_ERROR
    result.stderr.fnmatch_lines(["*collection does not match execution manifest*"])


def test_plugin_rejects_manifest_for_another_executor(pytester: pytest.Pytester) -> None:
    payload = manifest_payload()
    payload["executor_id"] = "api"
    manifest = write_manifest(pytester, payload)
    write_case(pytester)

    result = pytester.runpytest(
        "--execution-manifest",
        str(manifest),
        "--collect-only",
    )

    assert result.ret == pytest.ExitCode.USAGE_ERROR
    result.stderr.fnmatch_lines(["*executor_id must be*playwright-web-ui*got*api*"])


def test_plugin_rejects_duplicate_collected_case(pytester: pytest.Pytester) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    write_case(pytester)
    pytester.makepyfile(
        test_duplicate="""
        from playwright_web_ui import automation_case

        @automation_case(
            project_id="data-assets",
            feature_id="asset-catalog",
            case_id="C0001",
        )
        def test_duplicate():
            pass
        """
    )

    result = pytester.runpytest(
        "--execution-manifest",
        str(manifest),
        "--collect-only",
    )

    assert result.ret == pytest.ExitCode.USAGE_ERROR
    result.stderr.fnmatch_lines(["*duplicate collected automation case*"])


@pytest.mark.parametrize("marker", ["skip(reason='not allowed')", "xfail(strict=False)"])
def test_plugin_rejects_skip_and_xfail_markers(
    pytester: pytest.Pytester,
    marker: str,
) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    pytester.makepyfile(
        f"""
        import pytest
        from playwright_web_ui import automation_case

        @pytest.mark.{marker}
        @automation_case(
            project_id="data-assets",
            feature_id="asset-catalog",
            case_id="C0001",
        )
        def test_case():
            pass
        """
    )

    result = pytester.runpytest(
        "--execution-manifest",
        str(manifest),
        "--collect-only",
    )

    assert result.ret == pytest.ExitCode.USAGE_ERROR
    result.stderr.fnmatch_lines(["*AUTOMATION_OUTCOME_FORBIDDEN*skip*xfail*"])


def test_runtime_fixtures_write_success_evidence_and_required_business_record(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    attempt = prepare_attempt(pytester, monkeypatch)
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
    with step(
        action="Create rule",
        expected="Rule is visible after refresh",
        target="Rule list",
    ):
        assert True
    business_records.record(
        record_type="data-quality-rule",
        record_id="rule-001",
        readback={"name": "rule-001", "status": "enabled"},
    )
"""
    )

    result = pytester.runpytest_subprocess(
        "--execution-manifest",
        str(manifest),
        "--alluredir",
        str(attempt / "allure-results"),
        *runtime_output_args(attempt),
    )

    result.assert_outcomes(passed=1)
    assert (attempt / "evidence" / "asset-catalog" / "C0001" / "step-001.json").is_file()
    assert (attempt / "business-records" / "asset-catalog" / "C0001.json").is_file()
    assert list((attempt / "allure-results").glob("*-attachment.png"))


def test_runtime_gate_fails_a_passing_test_without_success_evidence(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    attempt = prepare_attempt(pytester, monkeypatch)
    pytester.makepyfile(
        fake_page_source()
        + """
from playwright_web_ui import automation_case

@automation_case(
    project_id="data-assets",
    feature_id="asset-catalog",
    case_id="C0001",
)
def test_case(business_records):
    business_records.record(
        record_type="data-quality-rule",
        record_id="rule-001",
        readback={"name": "rule-001"},
    )
"""
    )

    result = run_runtime(pytester, manifest, attempt)

    assert result.ret == pytest.ExitCode.TESTS_FAILED
    result.stdout.fnmatch_lines(["*EVIDENCE_REQUIRED*data-assets/asset-catalog/C0001*"])


def test_runtime_gate_fails_a_passing_required_case_without_business_record(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    attempt = prepare_attempt(pytester, monkeypatch)
    pytester.makepyfile(
        fake_page_source()
        + """
from playwright_web_ui import automation_case

@automation_case(
    project_id="data-assets",
    feature_id="asset-catalog",
    case_id="C0001",
)
def test_case(step):
    with step(action="Read", expected="Visible", target="Rule list"):
        assert True
"""
    )

    result = run_runtime(pytester, manifest, attempt)

    assert result.ret == pytest.ExitCode.TESTS_FAILED
    result.stdout.fnmatch_lines(["*BUSINESS_RECORD_REQUIRED*data-assets/asset-catalog/C0001*"])


def test_autouse_recorder_captures_failure_without_explicit_step_fixture(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    attempt = prepare_attempt(pytester, monkeypatch)
    pytester.makepyfile(
        fake_page_source()
        + """
from playwright_web_ui import automation_case

@pytest.fixture
def failing_setup():
    raise RuntimeError("fixture failed")

@automation_case(
    project_id="data-assets",
    feature_id="asset-catalog",
    case_id="C0001",
)
def test_case(failing_setup):
    pass
"""
    )

    result = run_runtime(pytester, manifest, attempt)

    assert result.ret == pytest.ExitCode.TESTS_FAILED
    failure = attempt / "evidence" / "asset-catalog" / "C0001" / "failure.json"
    assert failure.is_file()
    payload = json.loads(failure.read_text(encoding="utf-8"))
    assert "fixture failed" in payload["error"]


@pytest.mark.parametrize("outcome", ["skip", "xpass"])
def test_runtime_rejects_dynamic_skip_or_xpass_even_with_complete_artifacts(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
    outcome: str,
) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    attempt = prepare_attempt(pytester, monkeypatch)
    dynamic_marker = (
        "request.node.add_marker(pytest.mark.xfail(strict=False))" if outcome == "xpass" else "pass"
    )
    final_statement = "pass" if outcome == "xpass" else 'pytest.skip("not allowed")'
    pytester.makepyfile(
        fake_page_source()
        + f"""
from playwright_web_ui import automation_case

@pytest.fixture(autouse=True)
def dynamic_outcome(request):
    {dynamic_marker}

@automation_case(
    project_id="data-assets",
    feature_id="asset-catalog",
    case_id="C0001",
)
def test_case(step, business_records):
    with step(action="Create", expected="Visible", target="Rule list"):
        assert True
    business_records.record(
        record_type="data-quality-rule",
        record_id="rule-001",
        readback={{"name": "rule-001"}},
    )
    {final_statement}
"""
    )

    result = run_runtime(pytester, manifest, attempt)

    assert result.ret == pytest.ExitCode.TESTS_FAILED
    expected_reason = "dynamic skip/skipif/xfail" if outcome == "xpass" else "runtime skip/xfail"
    result.stdout.fnmatch_lines([f"*AUTOMATION_OUTCOME_FORBIDDEN*{expected_reason}*"])
    allure_results = list((attempt / "allure-results").glob("*-result.json"))
    assert len(allure_results) == 1
    allure_payload = json.loads(allure_results[0].read_text(encoding="utf-8"))
    assert allure_payload["status"] == "failed"


def test_artifact_gate_rejects_tampered_secret_like_business_record(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    attempt = prepare_attempt(pytester, monkeypatch)
    record_path = attempt / "business-records" / "asset-catalog" / "C0001.json"
    pytester.makepyfile(
        fake_page_source()
        + f"""
import json
from pathlib import Path

from playwright_web_ui import automation_case

@automation_case(
    project_id="data-assets",
    feature_id="asset-catalog",
    case_id="C0001",
)
def test_case(step):
    with step(action="Read", expected="Visible", target="Rule list"):
        assert True
    path = Path({str(record_path)!r})
    path.parent.mkdir(parents=True)
    path.write_text(json.dumps({{
        "schema_version": 1,
        "project_id": "data-assets",
        "feature_id": "asset-catalog",
        "case_id": "C0001",
        "record_type": "data-quality-rule",
        "record_id": "rule-001",
        "ui_readback": {{"cookie": "synthetic-secret"}},
    }}), encoding="utf-8")
"""
    )

    result = run_runtime(pytester, manifest, attempt)

    assert result.ret == pytest.ExitCode.TESTS_FAILED
    result.stdout.fnmatch_lines(
        ["*BUSINESS_RECORD_SECRET_FORBIDDEN*data-assets/asset-catalog/C0001*"]
    )


def test_artifact_gate_revalidates_tampered_business_record_identity(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    attempt = prepare_attempt(pytester, monkeypatch)
    record_path = attempt / "business-records" / "asset-catalog" / "C0001.json"
    pytester.makepyfile(
        fake_page_source()
        + f"""
import json
from pathlib import Path

from playwright_web_ui import automation_case

@automation_case(
    project_id="data-assets",
    feature_id="asset-catalog",
    case_id="C0001",
)
def test_case(step):
    with step(action="Read", expected="Visible", target="Rule list"):
        assert True
    path = Path({str(record_path)!r})
    path.parent.mkdir(parents=True)
    path.write_text(json.dumps({{
        "schema_version": 1,
        "project_id": "data-assets",
        "feature_id": "asset-catalog",
        "case_id": "C0001",
        "record_type": "data-quality-rule",
        "record_id": "",
        "ui_readback": {{"name": "rule-001"}},
    }}), encoding="utf-8")
"""
    )

    result = run_runtime(pytester, manifest, attempt)

    assert result.ret == pytest.ExitCode.TESTS_FAILED
    result.stdout.fnmatch_lines(["*BUSINESS_RECORD_INVALID*data-assets/asset-catalog/C0001*"])


def test_artifact_gate_rejects_success_evidence_pointing_outside_attempt(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    manifest = write_manifest(pytester, manifest_payload())
    attempt = prepare_attempt(pytester, monkeypatch)
    outside_screenshot = pytester.path / "outside.png"
    outside_screenshot.write_bytes(b"not-attempt-evidence")
    case_path = attempt / "evidence" / "asset-catalog" / "C0001"
    pytester.makepyfile(
        fake_page_source()
        + f"""
import json
from pathlib import Path

from playwright_web_ui import automation_case

@automation_case(
    project_id="data-assets",
    feature_id="asset-catalog",
    case_id="C0001",
)
def test_case(business_records):
    business_records.record(
        record_type="data-quality-rule",
        record_id="rule-001",
        readback={{"name": "rule-001"}},
    )
    path = Path({str(case_path)!r})
    path.mkdir(parents=True)
    (path / "step-001.json").write_text(json.dumps({{
        "schema_version": 1,
        "project_id": "data-assets",
        "feature_id": "asset-catalog",
        "case_id": "C0001",
        "sequence": 1,
        "status": "passed",
        "action": "Read",
        "expected": "Visible",
        "target": "Rule list",
        "screenshot": {str(outside_screenshot)!r},
    }}), encoding="utf-8")
"""
    )

    result = run_runtime(pytester, manifest, attempt)

    assert result.ret == pytest.ExitCode.TESTS_FAILED
    result.stdout.fnmatch_lines(["*EVIDENCE_INVALID*data-assets/asset-catalog/C0001*"])


def test_not_applicable_case_uses_manifest_reason_without_fake_record(
    pytester: pytest.Pytester,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    payload = manifest_payload()
    cases = cast("list[dict[str, object]]", payload["cases"])
    selected = cases[0]
    selected["business_record"] = {
        "policy": "not_applicable",
        "reason": "Read-only validation.",
    }
    manifest = write_manifest(pytester, payload)
    attempt = prepare_attempt(pytester, monkeypatch)
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
    assert business_records.policy == "not_applicable"
    assert business_records.reason == "Read-only validation."
    with step(action="Read", expected="Visible", target="Rule list"):
        assert True
"""
    )

    result = run_runtime(pytester, manifest, attempt)

    result.assert_outcomes(passed=1)
    assert not list((attempt / "business-records").rglob("*.json"))


def test_runtime_artifact_gate_is_xdist_safe(
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
    for case_id in ("C0001", "C0002"):
        source = (
            fake_page_source()
            + f"""

from playwright_web_ui import automation_case

@automation_case(
    project_id="data-assets",
    feature_id="asset-catalog",
    case_id="{case_id}",
)
def test_case(step, business_records):
    with step(action="Create", expected="Visible", target="Rule list"):
        assert True
    business_records.record(
        record_type="data-quality-rule",
        record_id="rule-{case_id}",
        readback={{"name": "rule-{case_id}"}},
    )
"""
        )
        pytester.makepyfile(**{f"test_{case_id.lower()}": source})

    result = run_runtime(pytester, manifest, attempt, "-n", "2")

    result.assert_outcomes(passed=2)
    evidence = list((attempt / "evidence" / "asset-catalog").glob("*/step-001.json"))
    records = list((attempt / "business-records" / "asset-catalog").glob("*.json"))
    assert len(evidence) == _XDIST_CASE_COUNT
    assert len(records) == _XDIST_CASE_COUNT
