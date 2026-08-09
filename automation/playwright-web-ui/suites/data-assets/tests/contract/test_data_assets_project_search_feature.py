from __future__ import annotations

import ast

from data_assets_playwright_web_ui import SUITE


def test_project_search_pin_has_one_explicit_python_item() -> None:
    path = (
        SUITE.tests_path
        / "v7.0.0"
        / "data-assets-core-module-integration-suite"
        / "c0004_quality_project_search_pin_test.py"
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
        "feature_id": "data-assets-core-module-integration-suite",
        "case_id": "C0004",
    }
    source = path.read_text(encoding="utf-8")
    assert "run_blocked_candidate" in source
    assert source.count("business_records.record(") == 1
