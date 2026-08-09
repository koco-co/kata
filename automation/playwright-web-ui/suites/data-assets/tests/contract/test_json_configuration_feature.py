from __future__ import annotations

import ast
import inspect
from typing import TYPE_CHECKING

from data_assets_playwright_web_ui import SUITE
from data_assets_playwright_web_ui.domains.data_quality.json_configuration.screen import (
    JsonConfigurationScreen,
)

if TYPE_CHECKING:
    from pathlib import Path

FEATURE_ID = "quality-json-format-configuration"
EXPECTED_CASE_IDS = tuple(f"C{number:04d}" for number in range(1, 45))
REQUIRED_BUSINESS_RECORD_IDS = frozenset(
    {
        "C0001",
        "C0004",
        "C0005",
        "C0007",
        "C0008",
        "C0010",
        "C0011",
        "C0016",
        "C0018",
        "C0025",
        "C0026",
        "C0027",
        "C0028",
        "C0032",
        "C0034",
        "C0041",
        "C0042",
        "C0043",
    }
)


def _feature_root() -> Path:
    return SUITE.tests_path / "v6.4.10" / FEATURE_ID


def _decorator_identity(path: Path) -> tuple[str, str, str]:
    module = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    functions = [node for node in module.body if isinstance(node, ast.FunctionDef)]
    assert len(functions) == 1, f"{path.name} must expose exactly one pytest item"
    decorators = [
        decorator
        for decorator in functions[0].decorator_list
        if isinstance(decorator, ast.Call)
        and isinstance(decorator.func, ast.Name)
        and decorator.func.id == "automation_case"
    ]
    assert len(decorators) == 1, f"{path.name} must have one automation_case decorator"
    values = {
        keyword.arg: ast.literal_eval(keyword.value)
        for keyword in decorators[0].keywords
        if keyword.arg is not None
    }
    return values["project_id"], values["feature_id"], values["case_id"]


def test_json_configuration_has_one_independent_file_per_canonical_case() -> None:
    files = sorted(_feature_root().glob("c[0-9][0-9][0-9][0-9]_*_test.py"))

    assert len(files) == len(EXPECTED_CASE_IDS)
    assert tuple(_decorator_identity(path) for path in files) == tuple(
        ("data-assets", FEATURE_ID, case_id) for case_id in EXPECTED_CASE_IDS
    )


def test_json_configuration_e2e_sources_keep_executor_safety_contract() -> None:
    source = "\n".join(path.read_text(encoding="utf-8") for path in _feature_root().glob("*.py"))

    for banned in ("async def", "pytest.skip", "pytest.xfail", "time.sleep", '"/tmp', "Date.now"):
        assert banned not in source
    assert "automation_identity" in source
    assert "tmp_path" in source
    assert "business_records.record" in source


def test_only_canonical_write_cases_emit_one_business_record() -> None:
    actual: set[str] = set()
    for path in _feature_root().glob("c[0-9][0-9][0-9][0-9]_*_test.py"):
        source = path.read_text(encoding="utf-8")
        case_id = _decorator_identity(path)[2]
        record_calls = source.count("business_records.record(")
        if record_calls:
            actual.add(case_id)
        assert record_calls == (1 if case_id in REQUIRED_BUSINESS_RECORD_IDS else 0)

    assert actual == REQUIRED_BUSINESS_RECORD_IDS


def test_combined_export_clears_the_previous_key_search_before_source_filtering() -> None:
    path = _feature_root() / "c0043_combined_filter_export_test.py"
    source = path.read_text(encoding="utf-8")
    first_filter = source.index("screen.filter_data_source(DataSourceType.HIVE)")

    assert source.rindex("screen.clear_search()", 0, first_filter) < first_filter


def test_page_size_selection_is_idempotent_and_list_filters_wait_for_their_response() -> None:
    page_size_source = inspect.getsource(JsonConfigurationScreen.set_page_size)
    screen_source = inspect.getsource(JsonConfigurationScreen)

    assert "selector.inner_text()" in page_size_source
    assert page_size_source.index("return") < page_size_source.index("selector.click()")
    assert "def _apply_column_filter" in screen_source
    assert "expect_response" in screen_source
    assert "_require_successful_list_response" in screen_source
