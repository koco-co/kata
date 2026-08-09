from __future__ import annotations

# ruff: noqa: INP001
from typing import TYPE_CHECKING

from data_assets_playwright_web_ui.domains.migration_gates import (
    CanonicalMigrationGate,
    run_blocked_candidate,
)
from playwright_web_ui import automation_case

if TYPE_CHECKING:
    from playwright_web_ui.pytest_plugin import StepFixture
    from playwright_web_ui.runtime_identity import AutomationRuntimeIdentity

_GATE = CanonicalMigrationGate("data-assets", "quality-json-key-range-validation", "C0001")


@automation_case(
    project_id="data-assets",
    feature_id="quality-json-key-range-validation",
    case_id="C0001",
)
def test_key_range_single_field_selection(
    automation_identity: AutomationRuntimeIdentity, step: StepFixture
) -> None:
    run_blocked_candidate(
        _GATE,
        automation_identity,
        step,
        action="打开 key 范围规则编辑器",
        expected="统计函数切换后字段选择变为单选",
        target="规则集",
    )
