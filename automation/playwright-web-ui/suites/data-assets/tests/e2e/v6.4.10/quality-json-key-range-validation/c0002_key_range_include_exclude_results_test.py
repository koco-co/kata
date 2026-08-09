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

_GATE = CanonicalMigrationGate("data-assets", "quality-json-key-range-validation", "C0002")


@automation_case(
    project_id="data-assets",
    feature_id="quality-json-key-range-validation",
    case_id="C0002",
)
def test_key_range_include_exclude_results(
    automation_identity: AutomationRuntimeIdentity,
    business_records: BusinessRecordRecorder,
    step: StepFixture,
) -> None:
    run_blocked_candidate(
        _GATE,
        automation_identity,
        step,
        action="创建并执行包含/不包含规则",
        expected="两阶段实例结果与 key 内容一致",
        target="规则任务",
    )
    business_records.record(record_type="json-key-range", record_id="C0002", readback={})
