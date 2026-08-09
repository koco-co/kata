from __future__ import annotations

# ruff: noqa: INP001
from typing import TYPE_CHECKING

from data_assets_playwright_web_ui.domains.data_quality.json_value_validation import (
    CASES,
    FEATURE_ID,
)
from playwright_web_ui import automation_case

if TYPE_CHECKING:
    from data_assets_playwright_web_ui.domains.data_quality.json_value_validation import (
        JsonValueValidationJourney,
    )
    from playwright_web_ui.pytest_plugin import StepFixture


@automation_case(
    project_id="data-assets",
    feature_id=FEATURE_ID,
    case_id="C0026",
)
def test_passed_instance_has_no_dirty_detail_entry(
    json_value_journey: JsonValueValidationJourney,
    step: StepFixture,
) -> None:
    case = CASES["C0026"]
    for datasource_key in case.datasource_keys:
        with step(
            action=f"打开 {datasource_key} 既有通过实例的 JSON 规则详情",
            expected="质检通过、原因 --、详情引用 meta-version 且无查看明细入口",
            target=f"{case.table_name}/{case.task_name}",
        ):
            result_view = json_value_journey.open_result(
                case,
                datasource_key,
                terminal_text="已完成",
            )
            json_value_journey.assertions.expect_task_result(
                result_view.detail,
                result="通过",
                keys=("meta-version",),
                field_type="string",
                failure_reason="--",
                detail_text='符合规则key为"meta-version"时的value格式要求',
                has_detail=False,
            )
