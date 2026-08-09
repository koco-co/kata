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

_GATE = CanonicalMigrationGate("data-assets", "quality-json-key-range-validation", "C0006")


@automation_case(
    project_id="data-assets",
    feature_id="quality-json-key-range-validation",
    case_id="C0006",
)
def test_key_range_nested_content_readback(
    automation_identity: AutomationRuntimeIdentity,
    business_records: BusinessRecordRecorder,
    step: StepFixture,
) -> None:
    run_blocked_candidate(
        _GATE,
        automation_identity,
        step,
        action="保存多层级 key 范围内容",
        expected="同层用短横线、层级组用分号回显",
        target="规则集",
    )
    business_records.record(record_type="json-key-range", record_id="C0006", readback={})
