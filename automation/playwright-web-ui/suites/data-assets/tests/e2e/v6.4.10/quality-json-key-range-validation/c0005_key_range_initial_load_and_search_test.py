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

_GATE = CanonicalMigrationGate("data-assets", "quality-json-key-range-validation", "C0005")


@automation_case(
    project_id="data-assets",
    feature_id="quality-json-key-range-validation",
    case_id="C0005",
)
def test_key_range_initial_load_and_search(
    automation_identity: AutomationRuntimeIdentity, step: StepFixture
) -> None:
    run_blocked_candidate(
        _GATE,
        automation_identity,
        step,
        action="打开超过 200 条 key 的校验内容下拉框",
        expected="首屏 200 条且搜索可命中未加载 key",
        target="规则集",
    )
