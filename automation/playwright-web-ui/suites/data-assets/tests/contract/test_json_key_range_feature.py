from __future__ import annotations

import ast
from typing import TYPE_CHECKING

from data_assets_playwright_web_ui import SUITE

if TYPE_CHECKING:
    from pathlib import Path

FEATURE_ID = "quality-json-key-range-validation"
EXPECTED_CASE_IDS = tuple(f"C{number:04d}" for number in (1, 2, 3, 4, 5, 6, 7, 8))
REQUIRED_RECORD_IDS = frozenset({"C0002", "C0006", "C0008"})


def _root() -> Path:
    return SUITE.tests_path / "v6.4.10" / FEATURE_ID


def _identity(path: Path) -> dict[str, str]:
    tree = ast.parse(path.read_text(encoding="utf-8"))
    function = next(node for node in tree.body if isinstance(node, ast.FunctionDef))
    call = next(
        node
        for node in function.decorator_list
        if isinstance(node, ast.Call)
        and isinstance(node.func, ast.Name)
        and node.func.id == "automation_case"
    )
    return {
        keyword.arg: ast.literal_eval(keyword.value)
        for keyword in call.keywords
        if keyword.arg is not None
    }


def test_json_key_range_has_one_item_per_canonical_case() -> None:
    files = sorted(_root().glob("c*_test.py"))
    assert len(files) == len(EXPECTED_CASE_IDS)
    assert tuple(_identity(path)["case_id"] for path in files) == EXPECTED_CASE_IDS
    assert all(
        _identity(path)["feature_id"] == FEATURE_ID
        and _identity(path)["project_id"] == "data-assets"
        for path in files
    )


def test_json_key_range_required_records_are_declared_and_fail_closed() -> None:
    for path in _root().glob("c*_test.py"):
        source = path.read_text(encoding="utf-8")
        case_id = _identity(path)["case_id"]
        assert "run_blocked_candidate" in source
        expected_records = 1 if case_id in REQUIRED_RECORD_IDS else 0
        assert source.count("business_records.record(") == expected_records
