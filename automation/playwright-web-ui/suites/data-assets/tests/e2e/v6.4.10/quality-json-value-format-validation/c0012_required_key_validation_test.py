from __future__ import annotations

# ruff: noqa: INP001, RUF001
import re
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
    case_id="C0012",
)
def test_empty_validation_key_blocks_save(
    json_value_journey: JsonValueValidationJourney,
    step: StepFixture,
) -> None:
    case = CASES["C0012"]
    for datasource_key in case.datasource_keys:
        rule_form = json_value_journey.unsaved_rule(
            case,
            datasource_key,
            field_name="info",
        )
        with step(
            action=f"在 {datasource_key} 不选择校验 key 并直接保存规则集",
            expected="出现精确必填错误，表单保留占位文案且仍停留在编辑页",
            target=f"{case.table_name}/格式-json格式校验",
        ):
            json_value_journey.screen.page.get_by_role(
                "button",
                name=re.compile(r"^保\s*存$"),
            ).last.click()
            notice = json_value_journey.screen.page.locator(".ant-message-notice").last
            expect(notice).to_contain_text(
                "“格式-json格式校验”统计函数存在必填项未填写",
            )
            selector = json_value_journey.screen.key_selector(rule_form)
            expect(selector.get_by_text("请选择校验key", exact=True)).to_be_visible()
            expect(json_value_journey.screen.page).to_have_url(
                re.compile(r"#/dq/ruleSet/edit/[0-9]+"),
            )
            expect(rule_form).to_be_visible()
