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
    case_id="C0028",
)
def test_passed_quality_report_has_complete_rule_columns(
    json_value_journey: JsonValueValidationJourney,
    step: StepFixture,
) -> None:
    case = CASES["C0028"]
    for datasource_key in case.datasource_keys:
        with step(
            action=f"打开 {datasource_key} TaskA 最新已生成质量报告",
            expected="JSON 规则行七个业务列与通过场景精确一致",
            target=f"{case.table_name}/{case.task_name}",
        ):
            detail = json_value_journey.screen.results.open_quality_report_task_detail(
                case,
                datasource_key,
            )
            json_value_journey.assertions.expect_quality_report_rule_table(
                detail,
                field_type="json",
                result="通过",
                reason="--",
                detail_text='符合规则key为"meta-version"时的value格式要求',
                has_detail=False,
            )
