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
    case_id="C0003",
)
def test_json_rule_is_available_for_canonical_field_types(
    json_value_journey: JsonValueValidationJourney,
    step: StepFixture,
) -> None:
    case = CASES["C0003"]
    canonical_fields = ("id", "info", "name")
    for datasource_key in case.datasource_keys:
        rule_form = json_value_journey.unsaved_rule(
            case,
            datasource_key,
            field_name="id",
            select_json_function=False,
        )
        for field_name in canonical_fields:
            with step(
                action=f"在 {datasource_key} 切换至 {field_name} 字段并打开统计规则",
                expected="格式-json格式校验可见且可选",
                target=f"{case.table_name}/{field_name}",
            ):
                json_value_journey.screen.select_field(rule_form, field_name)
                dropdown = json_value_journey.screen.open_function_options(rule_form)
                json_value_journey.assertions.expect_rule_option(dropdown, visible=True)
                json_value_journey.screen.close_dropdown()
