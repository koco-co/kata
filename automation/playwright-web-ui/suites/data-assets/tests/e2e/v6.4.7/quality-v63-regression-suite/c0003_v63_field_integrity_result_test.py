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

_GATE = CanonicalMigrationGate("data-assets", "quality-v63-regression-suite", "C0003")


@automation_case(
    project_id="data-assets",
    feature_id="quality-v63-regression-suite",
    case_id="C0003",
)
def test_v63_field_integrity_result(
    automation_identity: AutomationRuntimeIdentity,
    business_records: BusinessRecordRecorder,
    step: StepFixture,
) -> None:
    run_blocked_candidate(
        _GATE,
        automation_identity,
        step,
        action="执行 v6.3 字段完整性规则",
        expected="单字段和多字段统计值与 SQL 预期一致",
        target="校验结果",
    )
    business_records.record(record_type="v63-regression", record_id="C0003", readback={})
