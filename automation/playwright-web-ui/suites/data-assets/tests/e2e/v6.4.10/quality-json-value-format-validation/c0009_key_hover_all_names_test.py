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
    case_id="C0009",
)
def test_key_selector_hover_reveals_all_configured_names(
    json_value_journey: JsonValueValidationJourney,
    step: StepFixture,
) -> None:
    case = CASES["C0009"]
    all_keys = ("field-key1", "field-key2", "field-key3", "field-key4")
    for datasource_key in case.datasource_keys:
        package = json_value_journey.screen.open_rule_set_editor(case, datasource_key)
        rule_form = json_value_journey.screen.existing_json_rule(package)
        selector = json_value_journey.screen.key_selector(rule_form)
        with step(
            action=f"查看 {datasource_key} 已保存规则的非悬浮 key 区域",
            expected="仅直接显示 field-key1、field-key2，其余两个不直接显示",
            target=f"{case.table_name}/校验 key",
        ):
            direct_tags = selector.locator(".ant-select-selection-item")
            expect(direct_tags.nth(0)).to_have_text("field-key1")
            expect(direct_tags.nth(1)).to_have_text("field-key2")
            expect(selector.get_by_text("field-key3", exact=True)).to_have_count(0)
            expect(selector.get_by_text("field-key4", exact=True)).to_have_count(0)
        with step(
            action="将鼠标悬浮到校验 key 区域",
            expected="浮层完整展示 field-key1 至 field-key4 四个 key",
            target="校验 key 悬浮浮层",
        ):
            selector.hover()
            tooltip = json_value_journey.screen.page.locator(".ant-tooltip:visible").last
            expect(tooltip).to_be_visible()
            for key_name in all_keys:
                expect(tooltip).to_contain_text(key_name)
