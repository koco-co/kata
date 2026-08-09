from __future__ import annotations

# ruff: noqa: INP001
from typing import TYPE_CHECKING

from data_assets_playwright_web_ui.domains.migration_gates import (
    CanonicalMigrationGate,
    run_blocked_candidate,
)
from playwright_web_ui import automation_case

if TYPE_CHECKING:
    from playwright_web_ui.business_records import BusinessRecordRecorder
    from playwright_web_ui.pytest_plugin import StepFixture
    from playwright_web_ui.runtime_identity import AutomationRuntimeIdentity

_GATE = CanonicalMigrationGate("data-assets", "data-assets-core-module-integration-suite", "C0004")


@automation_case(
    project_id="data-assets",
    feature_id="data-assets-core-module-integration-suite",
    case_id="C0004",
)
def test_quality_project_search_pin(
    automation_identity: AutomationRuntimeIdentity,
    business_records: BusinessRecordRecorder,
    step: StepFixture,
) -> None:
    run_blocked_candidate(
        _GATE,
        automation_identity,
        step,
        action="搜索并置顶质量项目",
        expected="匹配项目位于首位并可进入规则任务",
        target="项目管理",
    )
    business_records.record(record_type="data-assets-project", record_id="C0004", readback={})
