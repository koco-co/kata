from __future__ import annotations

import ast

from data_assets_playwright_web_ui import SUITE


def test_selected_export_has_one_python_item_and_uses_safe_workbook_readback() -> None:
    path = (
        SUITE.tests_path
        / "v7.0.0"
        / "quality-json-format-selected-export"
        / "c0001_selected_json_export_test.py"
    )
    tree = ast.parse(path.read_text(encoding="utf-8"))
    function = next(node for node in tree.body if isinstance(node, ast.FunctionDef))
    call = next(
        node
        for node in function.decorator_list
        if isinstance(node, ast.Call)
        and isinstance(node.func, ast.Name)
        and node.func.id == "automation_case"
    )
    values = {
        keyword.arg: ast.literal_eval(keyword.value) for keyword in call.keywords if keyword.arg
    }
    assert values == {
        "project_id": "data-assets",
        "feature_id": "quality-json-format-selected-export",
        "case_id": "C0001",
    }
    source = path.read_text(encoding="utf-8")
    assert "JsonConfigurationWorkbook.inspect_export" in source
    assert "assert_export_filename" in source
    assert "business_records" not in source
