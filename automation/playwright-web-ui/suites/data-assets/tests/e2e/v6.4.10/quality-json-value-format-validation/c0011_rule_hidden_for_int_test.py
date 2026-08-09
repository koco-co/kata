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
    case_id="C0011",
)
def test_json_rule_is_hidden_for_int_field(
    json_value_journey: JsonValueValidationJourney,
    step: StepFixture,
) -> None:
    case = CASES["C0011"]
    for datasource_key in case.datasource_keys:
        with step(
            action=f"在 {datasource_key} 新增有效性规则并选择 count_val(int)",
            expected="统计规则下拉不出现格式-json格式校验",
            target=f"{case.table_name}/count_val",
        ):
            rule_form = json_value_journey.unsaved_rule(
                case,
                datasource_key,
                field_name="count_val",
                select_json_function=False,
            )
            dropdown = json_value_journey.screen.open_function_options(rule_form)
            json_value_journey.assertions.expect_rule_option(dropdown, visible=False)
            json_value_journey.screen.close_dropdown()
