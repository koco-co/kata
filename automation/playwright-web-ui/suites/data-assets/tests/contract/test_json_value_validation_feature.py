from __future__ import annotations

import ast
import runpy
from inspect import signature
from typing import TYPE_CHECKING, cast

from data_assets_playwright_web_ui import SUITE
from playwright_web_ui.source_policy import (
    validate_controlled_browser_sources,
    validate_sync_only_sources,
)

if TYPE_CHECKING:
    from collections.abc import Callable
    from pathlib import Path

    import pytest

FEATURE_ID = "quality-json-value-format-validation"
EXPECTED_RESULT_RESPONSE_GATES = 2
MAX_DOMAIN_FILE_LINES = 800
E2E_ROOT = SUITE.tests_path / "v6.4.10" / FEATURE_ID
DOMAIN_ROOT = (
    SUITE.root_path
    / "src"
    / "data_assets_playwright_web_ui"
    / "domains"
    / "data_quality"
    / "json_value_validation"
)
EXPECTED_CASES = {
    "c0001_rule_option_order_test.py": "C0001",
    "c0002_rule_has_no_independent_help_test.py": "C0002",
    "c0003_rule_visible_for_field_types_test.py": "C0003",
    "c0004_configured_keys_selectability_test.py": "C0004",
    "c0005_key_multi_select_and_all_test.py": "C0005",
    "c0006_key_search_test.py": "C0006",
    "c0007_key_initial_limit_and_search_test.py": "C0007",
    "c0008_saved_key_readback_test.py": "C0008",
    "c0009_key_hover_all_names_test.py": "C0009",
    "c0010_value_format_preview_pagination_test.py": "C0010",
    "c0011_rule_hidden_for_int_test.py": "C0011",
    "c0012_required_key_validation_test.py": "C0012",
    "c0013_saved_rule_parameters_test.py": "C0013",
    "c0014_passing_end_to_end_flow_test.py": "C0014",
    "c0015_failing_end_to_end_flow_test.py": "C0015",
    "c0016_sparkthrift_execution_result_test.py": "C0016",
    "c0017_doris_execution_result_test.py": "C0017",
    "c0018_hive_execution_result_test.py": "C0018",
    "c0019_large_key_execution_result_test.py": "C0019",
    "c0020_deleted_key_rule_readback_test.py": "C0020",
    "c0021_deleted_key_preview_execution_test.py": "C0021",
    "c0022_sampling_execution_result_test.py": "C0022",
    "c0023_partition_execution_result_test.py": "C0023",
    "c0024_built_in_rule_export_test.py": "C0024",
    "c0025_failed_detail_download_style_test.py": "C0025",
    "c0026_passed_instance_no_detail_test.py": "C0026",
    "c0027_failed_instance_log_test.py": "C0027",
    "c0028_passed_quality_report_test.py": "C0028",
    "c0029_failed_quality_report_test.py": "C0029",
}
REQUIRED_RECORD_CASES = {
    "C0008",
    "C0014",
    "C0015",
    "C0016",
    "C0017",
    "C0018",
    "C0019",
    "C0020",
    "C0021",
    "C0022",
    "C0023",
}
ATTEMPT_TASK_CASES = {
    "c0016_sparkthrift_execution_result_test.py",
    "c0017_doris_execution_result_test.py",
    "c0018_hive_execution_result_test.py",
    "c0019_large_key_execution_result_test.py",
    "c0021_deleted_key_preview_execution_test.py",
    "c0022_sampling_execution_result_test.py",
    "c0023_partition_execution_result_test.py",
}


def _load_single_test(path: Path) -> Callable[..., None]:
    namespace = cast("dict[str, object]", runpy.run_path(str(path)))
    tests = [
        value for name, value in namespace.items() if name.startswith("test_") and callable(value)
    ]
    assert len(tests) == 1
    return cast("Callable[..., None]", tests[0])


def _automation_marker(test: Callable[..., None]) -> pytest.Mark:
    markers = cast("list[pytest.Mark]", getattr(test, "pytestmark", []))
    automation_markers = [marker for marker in markers if marker.name == "automation_case"]
    assert len(automation_markers) == 1
    return automation_markers[0]


def _source_tree(path: Path) -> ast.Module:
    return ast.parse(path.read_text(encoding="utf-8"), filename=str(path))


def test_feature_has_exactly_one_importable_item_per_canonical_case() -> None:
    assert {path.name for path in E2E_ROOT.glob("c*_test.py")} == set(EXPECTED_CASES)

    for filename, case_id in EXPECTED_CASES.items():
        test = _load_single_test(E2E_ROOT / filename)
        marker = _automation_marker(test)
        assert marker.args == ()
        assert marker.kwargs == {
            "project_id": "data-assets",
            "feature_id": FEATURE_ID,
            "case_id": case_id,
        }


def test_business_record_policy_is_encoded_in_typed_fixture_contract() -> None:
    for filename, case_id in EXPECTED_CASES.items():
        path = E2E_ROOT / filename
        test = _load_single_test(path)
        parameters = tuple(signature(test).parameters)
        calls = [
            node
            for node in ast.walk(_source_tree(path))
            if isinstance(node, ast.Call)
            and isinstance(node.func, ast.Attribute)
            and node.func.attr == "record"
        ]
        if case_id in REQUIRED_RECORD_CASES:
            assert "automation_identity" in parameters
            assert "business_records" in parameters
            assert len(calls) == 1
        else:
            assert "business_records" not in parameters
            assert len(calls) == 0


def test_feature_uses_domain_layout_and_executor_source_policies() -> None:
    assert {path.name for path in DOMAIN_ROOT.glob("*.py")} == {
        "__init__.py",
        "actions.py",
        "assertions.py",
        "fixtures.py",
        "model.py",
        "result_screen.py",
        "screen.py",
    }
    assert all(
        len(path.read_text(encoding="utf-8").splitlines()) <= MAX_DOMAIN_FILE_LINES
        for path in DOMAIN_ROOT.glob("*.py")
    )
    validate_sync_only_sources((DOMAIN_ROOT, E2E_ROOT))
    validate_controlled_browser_sources((DOMAIN_ROOT, E2E_ROOT))


def test_no_case_uses_skip_xfail_mock_todo_or_weak_fallbacks() -> None:
    forbidden = ("pytest.skip", "pytest.xfail", "TODO", ".or_(", "except Exception")
    for path in (*DOMAIN_ROOT.glob("*.py"), *E2E_ROOT.glob("*.py")):
        source = path.read_text(encoding="utf-8")
        for token in forbidden:
            assert token not in source


def test_task_execution_waits_for_exact_result_query_responses() -> None:
    result_source = (DOMAIN_ROOT / "result_screen.py").read_text(encoding="utf-8")
    actions_source = (DOMAIN_ROOT / "actions.py").read_text(encoding="utf-8")

    assert "/dassets/v1/valid/monitorRecord/pageQuery" in result_source
    assert result_source.count("expect_response(") >= EXPECTED_RESULT_RESPONSE_GATES
    assert "response.ok" in result_source
    assert "wait_for_timeout" not in result_source
    assert actions_source.index("capture_result_baseline") < actions_source.index("execute_task")
    assert actions_source.index("execute_task") < actions_source.index("open_new_result")


def test_execution_cases_create_and_record_attempt_unique_tasks() -> None:
    for filename in ATTEMPT_TASK_CASES:
        source = (E2E_ROOT / filename).read_text(encoding="utf-8")
        create_offset = source.index("create_attempt_task_from_existing_package")
        execute_offset = source.index("execute_and_open_result(")
        assert create_offset < execute_offset
        assert "attempt_case" in source
        assert "TaskA" not in source
        if filename.startswith(("c0016_", "c0017_", "c0018_")):
            assert "attempt_case.task_name" in source
        else:
            assert 'record_id="|".join(attempt_task_names)' in source


def test_quality_report_candidates_enter_task_detail_before_table_contract() -> None:
    result_source = (DOMAIN_ROOT / "result_screen.py").read_text(encoding="utf-8")
    task_offset = result_source.index("_latest_report_task_row(")
    detail_offset = result_source.index('name="查看详情"', task_offset)
    response_offset = result_source.index(
        "self._require_ok_task_detail_report_response(response)",
        detail_offset,
    )
    drawer_offset = result_source.index("detail = self._result_drawer()", response_offset)
    return_offset = result_source.index("return detail", drawer_offset)

    assert task_offset < detail_offset < response_offset < drawer_offset < return_offset
    assert "response.finished()" in result_source[response_offset:drawer_offset]
    assert "return self.json_rule_card(self._result_drawer())" not in result_source
    for filename in (
        "c0028_passed_quality_report_test.py",
        "c0029_failed_quality_report_test.py",
    ):
        source = (E2E_ROOT / filename).read_text(encoding="utf-8")
        assert "open_quality_report_task_detail(" in source
        assert "expect_quality_report_rule_table(" in source
        assert "filter(has_text=case.task_name)" not in source


def test_quality_report_uses_the_titled_recent_verification_section() -> None:
    source = (DOMAIN_ROOT / "result_screen.py").read_text(encoding="utf-8")

    assert '_unique_report_section_table("近期规则校验异常明细")' in source
    assert "ancestor::div" in source
    assert 'section.locator(".ant-table")' in source
    assert 'locator(".tableValidStatistics .dt-table-border .ant-table")' not in source


def test_quality_report_requires_a_real_canonical_seven_column_table() -> None:
    source = (DOMAIN_ROOT / "assertions.py").read_text(encoding="utf-8")
    method_start = source.index("def expect_quality_report_rule_table(")
    method_end = source.index("def inspect_exported_rule_library(", method_start)
    method_source = source[method_start:method_end]

    assert "_canonical_quality_report_table(detail)" in method_source
    assert 'indexes["规则类型"]' in method_source
    assert 'indexes["规则名称"]' in method_source
    assert "_description_value" not in source
