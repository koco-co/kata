from __future__ import annotations

import ast

from data_assets_playwright_web_ui import SUITE

FEATURE_ID = "quality-v63-regression-suite"
EXPECTED_CASE_IDS = ("C0001", "C0002", "C0003", "C0004")
EXPECTED_FILE_COUNT = 4


def test_v63_regression_has_four_explicit_python_items() -> None:
    root = SUITE.tests_path / "v6.4.7" / FEATURE_ID
    files = sorted(root.glob("c*_test.py"))
    assert len(files) == EXPECTED_FILE_COUNT
    identities: list[str] = []
    for path in files:
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
        identities.append(str(values["case_id"]))
        source = path.read_text(encoding="utf-8")
        assert "run_blocked_candidate" in source
        assert source.count("business_records.record(") == 1
    assert tuple(identities) == EXPECTED_CASE_IDS
