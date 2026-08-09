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
    case_id="C0006",
)
def test_key_search_filters_and_restores_exact_results(
    json_value_journey: JsonValueValidationJourney,
    step: StepFixture,
) -> None:
    case = CASES["C0006"]
    for datasource_key in case.datasource_keys:
        rule_form = json_value_journey.unsaved_rule(
            case,
            datasource_key,
            field_name="info",
        )
        dropdown = json_value_journey.screen.open_key_dropdown(rule_form)
        json_value_journey.screen.expand_key_tree(dropdown)
        search = json_value_journey.screen.key_search(rule_form)
        with step(
            action=f"在 {datasource_key} 的校验 key 搜索框输入 order",
            expected="仅显示 order-amount、order-status，不显示 user-name",
            target="校验 key 搜索结果",
        ):
            search.fill("order")
            expect(dropdown.get_by_text("order-amount", exact=True)).to_be_visible()
            expect(dropdown.get_by_text("order-status", exact=True)).to_be_visible()
            expect(dropdown.get_by_text("user-name", exact=True)).to_have_count(0)
        with step(
            action="清空校验 key 搜索框",
            expected="order-amount、order-status、user-name 三个 key 全部恢复显示",
            target="校验 key 下拉树",
        ):
            search.fill("")
            for key_name in ("order-amount", "order-status", "user-name"):
                expect(dropdown.get_by_text(key_name, exact=True)).to_be_visible()
            json_value_journey.screen.close_dropdown()
