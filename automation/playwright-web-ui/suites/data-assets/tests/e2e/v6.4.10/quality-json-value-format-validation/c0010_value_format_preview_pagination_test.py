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
    case_id="C0010",
)
def test_value_format_preview_tracks_selection_and_paginates(
    json_value_journey: JsonValueValidationJourney,
    step: StepFixture,
) -> None:
    case = CASES["C0010"]
    first_three = ("check-key-01", "check-key-02", "check-key-03")
    for datasource_key in case.datasource_keys:
        rule_form = json_value_journey.unsaved_rule(
            case,
            datasource_key,
            field_name="info",
        )
        json_value_journey.select_keys(rule_form, first_three)
        with step(
            action=f"打开 {datasource_key} 已选三个 key 的 value 格式预览",
            expected="仅显示三个已选 key、两列标题及前两个 key 的精确正则",
            target="value 格式预览弹窗",
        ):
            modal = json_value_journey.screen.open_value_preview(rule_form)
            expect(modal.locator("thead")).to_contain_text("key")
            expect(modal.locator("thead")).to_contain_text("value格式")
            body = modal.locator("tbody")
            for key_name in first_three:
                expect(body.get_by_text(key_name, exact=True)).to_be_visible()
            for index in range(4, 16):
                expect(body.get_by_text(f"check-key-{index:02d}", exact=True)).to_have_count(0)
            expect(body).to_contain_text(r"^[A-Z]{2}\d{4}$")
            expect(body).to_contain_text(r"^1[3-9]\d{9}$")
            modal.locator(".ant-modal-close").click()
        with step(
            action="取消 check-key-03 后再次预览",
            expected="预览仅剩 check-key-01、check-key-02，check-key-03 消失",
            target="value 格式预览筛选",
        ):
            dropdown = json_value_journey.screen.open_key_dropdown(rule_form)
            key_node = json_value_journey.screen.key_node(dropdown, "check-key-03")
            key_node.locator(".ant-select-tree-checkbox").click()
            json_value_journey.assertions.expect_key_state(
                key_node,
                checked=False,
                disabled=False,
            )
            json_value_journey.screen.close_dropdown()
            modal = json_value_journey.screen.open_value_preview(rule_form)
            expect(modal.get_by_text("check-key-01", exact=True)).to_be_visible()
            expect(modal.get_by_text("check-key-02", exact=True)).to_be_visible()
            expect(modal.get_by_text("check-key-03", exact=True)).to_have_count(0)
            modal.locator(".ant-modal-close").click()
        with step(
            action="补选 check-key-03 至 check-key-12 并打开预览第二页",
            expected="出现分页，默认第一页，第二页可查看剩余 key",
            target="12 条 value 格式分页",
        ):
            dropdown = json_value_journey.screen.open_key_dropdown(rule_form)
            for index in range(3, 13):
                json_value_journey.screen.select_key(dropdown, f"check-key-{index:02d}")
            json_value_journey.screen.close_dropdown()
            modal = json_value_journey.screen.open_value_preview(rule_form)
            pagination = modal.locator(".ant-pagination")
            expect(pagination).to_be_visible()
            expect(pagination.locator(".ant-pagination-item-active")).to_have_text("1")
            pagination.locator(".ant-pagination-item-2").click()
            expect(pagination.locator(".ant-pagination-item-active")).to_have_text("2")
            expect(modal.get_by_text("check-key-11", exact=True)).to_be_visible()
            expect(modal.get_by_text("check-key-12", exact=True)).to_be_visible()
            modal.locator(".ant-modal-close").click()
