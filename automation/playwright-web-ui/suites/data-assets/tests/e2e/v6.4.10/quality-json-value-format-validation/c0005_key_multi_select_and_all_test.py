from __future__ import annotations

# ruff: noqa: INP001, RUF001
from typing import TYPE_CHECKING

from playwright.sync_api import expect

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
    case_id="C0005",
)
def test_key_multi_select_select_all_and_clear_all(
    json_value_journey: JsonValueValidationJourney,
    step: StepFixture,
) -> None:
    case = CASES["C0005"]
    configured_keys = ("person-name", "person-age")
    for datasource_key in case.datasource_keys:
        rule_form = json_value_journey.unsaved_rule(
            case,
            datasource_key,
            field_name="info",
        )
        with step(
            action=f"在 {datasource_key} 逐个多选 person-name 与 person-age",
            expected="两个 key 均保持选中并按层级名称精确回显",
            target="校验 key TreeSelect",
        ):
            json_value_journey.select_keys(rule_form, configured_keys)
        with step(
            action="重新打开 key 树并选择源码定义的“全部”节点",
            expected="唯一回显“全部”，其他可选节点禁用以表达全选语义",
            target="校验 key 全选节点",
        ):
            dropdown = json_value_journey.screen.open_key_dropdown(rule_form)
            json_value_journey.screen.expand_key_tree(dropdown)
            all_node = json_value_journey.screen.key_node(dropdown, "全部")
            all_node.locator(".ant-select-tree-checkbox").click()
            json_value_journey.assertions.expect_key_state(
                all_node,
                checked=True,
                disabled=False,
            )
            for key_name in configured_keys:
                json_value_journey.assertions.expect_key_state(
                    json_value_journey.screen.key_node(dropdown, key_name),
                    checked=False,
                    disabled=True,
                )
            json_value_journey.screen.close_dropdown()
            json_value_journey.assertions.expect_selected_tags(
                json_value_journey.screen.key_selector(rule_form),
                ("全部",),
            )
        with step(
            action="再次点击“全部”取消全选",
            expected="所有选择被清空并恢复“请选择校验key”占位文案",
            target="校验 key TreeSelect",
        ):
            dropdown = json_value_journey.screen.open_key_dropdown(rule_form)
            all_node = json_value_journey.screen.key_node(dropdown, "全部")
            all_node.locator(".ant-select-tree-checkbox").click()
            json_value_journey.screen.close_dropdown()
            selector = json_value_journey.screen.key_selector(rule_form)
            json_value_journey.assertions.expect_selected_tags(selector, ())
            expect(selector.get_by_text("请选择校验key", exact=True)).to_be_visible()
