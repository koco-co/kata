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
    case_id="C0007",
)
def test_initial_key_limit_and_search_beyond_two_hundred(
    json_value_journey: JsonValueValidationJourney,
    step: StepFixture,
) -> None:
    case = CASES["C0007"]
    for datasource_key in case.datasource_keys:
        rule_form = json_value_journey.unsaved_rule(
            case,
            datasource_key,
            field_name="info",
        )
        dropdown = json_value_journey.screen.open_key_dropdown(rule_form)
        with step(
            action=f"首次展开 {datasource_key} 的 210 条校验 key 列表",
            expected="边界 key 001、200 可见，201、205、210 尚未加载",
            target="校验 key 初始 200 条窗口",
        ):
            expect(dropdown.get_by_text("test-key-001", exact=True)).to_be_visible()
            dropdown.locator(".rc-virtual-list-holder").evaluate(
                "element => { element.scrollTop = element.scrollHeight; }",
            )
            expect(dropdown.get_by_text("test-key-200", exact=True)).to_be_visible()
            for key_name in ("test-key-201", "test-key-205", "test-key-210"):
                expect(dropdown.get_by_text(key_name, exact=True)).to_have_count(0)
        with step(
            action="搜索初始窗口之外的 test-key-205 并选中",
            expected="搜索结果展示 test-key-205，选中后选择器精确回显该 key",
            target="test-key-205",
        ):
            json_value_journey.screen.key_search(rule_form).fill("test-key-205")
            json_value_journey.screen.select_key(dropdown, "test-key-205")
            json_value_journey.screen.close_dropdown()
            json_value_journey.assertions.expect_selected_tags(
                json_value_journey.screen.key_selector(rule_form),
                ("test-key-205",),
            )
