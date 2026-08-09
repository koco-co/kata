from __future__ import annotations

# ruff: noqa: INP001, RUF001
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
    case_id="C0002",
)
def test_json_rule_has_no_independent_help_entry(
    json_value_journey: JsonValueValidationJourney,
    step: StepFixture,
) -> None:
    case = CASES["C0002"]
    for datasource_key in case.datasource_keys:
        with step(
            action=f"在 {datasource_key} 的 info 字段选择格式-json格式校验",
            expected="规则行展示 key 配置，但不展示独立帮助或提示入口",
            target=f"{case.table_name}/格式-json格式校验",
        ):
            rule_form = json_value_journey.unsaved_rule(
                case,
                datasource_key,
                field_name="info",
            )
            function_row = json_value_journey.screen.function_row(rule_form)
            json_value_journey.assertions.expect_no_independent_help(function_row)
            json_value_journey.screen.key_selector(rule_form)
