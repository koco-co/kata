from __future__ import annotations

import runpy
from inspect import signature
from typing import TYPE_CHECKING, cast

from data_assets_playwright_web_ui import SUITE
from data_assets_playwright_web_ui.domains.data_model.schema_design.screen import (
    MY_MODEL_CANONICAL_HEADERS,
    SPECIFICATION_DESIGN_OPERATIONS,
)
from playwright_web_ui.source_policy import (
    validate_controlled_browser_sources,
    validate_sync_only_sources,
)

if TYPE_CHECKING:
    from collections.abc import Callable
    from pathlib import Path

    import pytest

FEATURE_ID = "data-assets-core-module-integration-suite"
E2E_ROOT = SUITE.tests_path / "v7.0.0" / FEATURE_ID
EXPECTED_CASES = {
    "c0002_data_standard_statistics_test.py": "C0002",
    "c0003_data_model_design_and_elements_test.py": "C0003",
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


def test_vertical_slice_has_exactly_one_importable_item_per_canonical_case() -> None:
    files = {path.name for path in E2E_ROOT.glob("*_test.py") if path.name in EXPECTED_CASES}
    assert files == set(EXPECTED_CASES)

    for filename, case_id in EXPECTED_CASES.items():
        test = _load_single_test(E2E_ROOT / filename)
        assert tuple(signature(test).parameters) == ("page", "platform_context", "step")
        marker = _automation_marker(test)
        assert marker.args == ()
        assert marker.kwargs == {
            "project_id": "data-assets",
            "feature_id": FEATURE_ID,
            "case_id": case_id,
        }


def test_vertical_slice_obeys_executor_source_policies() -> None:
    roots = (SUITE.root_path / "src", E2E_ROOT)

    validate_sync_only_sources(roots)
    validate_controlled_browser_sources(roots)


def test_c0003_uses_canonical_creation_time_and_complete_operation_semantics() -> None:
    assert MY_MODEL_CANONICAL_HEADERS == ("表名", "表中文名", "创建时间", "操作")
    assert SPECIFICATION_DESIGN_OPERATIONS == ("新建数仓层级", "编辑", "删除")
