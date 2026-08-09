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
    case_id="C0004",
)
def test_only_configured_json_keys_are_selectable(
    json_value_journey: JsonValueValidationJourney,
    step: StepFixture,
) -> None:
    case = CASES["C0004"]
    for datasource_key in case.datasource_keys:
        with step(
            action=f"展开 {datasource_key} 的 person 层级 key 树",
            expected="person-name、person-age 可选，未配置格式的 person-email 禁用",
            target=f"{case.table_name}/person",
        ):
            rule_form = json_value_journey.unsaved_rule(
                case,
                datasource_key,
                field_name="info",
            )
            dropdown = json_value_journey.screen.open_key_dropdown(rule_form)
            json_value_journey.screen.expand_key_tree(dropdown)
            name_node = json_value_journey.screen.key_node(dropdown, "person-name")
            age_node = json_value_journey.screen.key_node(dropdown, "person-age")
            email_node = json_value_journey.screen.key_node(dropdown, "person-email")
            json_value_journey.assertions.expect_key_state(
                name_node,
                checked=False,
                disabled=False,
            )
            json_value_journey.assertions.expect_key_state(
                age_node,
                checked=False,
                disabled=False,
            )
            json_value_journey.assertions.expect_key_state(
                email_node,
                checked=False,
                disabled=True,
            )
        with step(
            action="保持禁用的 person-email 未选中，再选择 person-name 与 person-age",
            expected="禁用项不可操作且未选中，选择器仅精确回显两个层级 key",
            target="校验 key TreeSelect",
        ):
            json_value_journey.assertions.expect_key_state(
                email_node,
                checked=False,
                disabled=True,
            )
            json_value_journey.screen.select_key(dropdown, "person-name")
            json_value_journey.screen.select_key(dropdown, "person-age")
            json_value_journey.screen.close_dropdown()
            json_value_journey.assertions.expect_selected_tags(
                json_value_journey.screen.key_selector(rule_form),
                ("person-name", "person-age"),
            )
