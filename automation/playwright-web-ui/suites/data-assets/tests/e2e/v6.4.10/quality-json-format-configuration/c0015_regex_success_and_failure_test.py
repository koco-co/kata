from __future__ import annotations

# ruff: noqa: INP001, RUF001
from typing import TYPE_CHECKING

from playwright.sync_api import expect

from data_assets_playwright_web_ui.domains.data_quality.json_configuration.model import JsonKeyDraft
from playwright_web_ui import automation_case

if TYPE_CHECKING:
    from data_assets_playwright_web_ui.domains.data_quality.json_configuration import (
        JsonConfigurationScreen,
    )
    from playwright_web_ui.pytest_plugin import StepFixture


@automation_case(
    project_id="data-assets", feature_id="quality-json-format-configuration", case_id="C0015"
)
def test_regex_area_success_failure_and_visibility(
    json_configuration_screen: JsonConfigurationScreen,
    step: StepFixture,
) -> None:
    json_configuration_screen.open()
    modal = json_configuration_screen.open_create()
    with step(
        action="打开新增表单并保持 value 格式为空",
        expected="测试数据输入框和正则匹配按钮均不显示",
        target="正则测试区域",
    ):
        expect(modal.locator("textarea")).to_have_count(0)
        expect(modal.get_by_role("button", name="正则匹配测试")).to_have_count(0)
    with step(
        action=r"填写 ^\d{6}$，先测试 123456 再测试 abcdef",
        expected="分别显示匹配成功和匹配失败",
        target="正则测试结果",
    ):
        json_configuration_screen.fill_draft(
            modal,
            JsonKeyDraft(key="regexTestKey", value_format=r"^\d{6}$"),
        )
        json_configuration_screen.regex_probe(modal, test_data="123456", expected_match=True)
        json_configuration_screen.regex_probe(modal, test_data="abcdef", expected_match=False)
    with step(
        action="清空 value 格式",
        expected="测试数据输入框和正则匹配按钮动态隐藏",
        target="value 格式输入框",
    ):
        modal.locator("input[id$='value']").fill("")
        expect(modal.locator("textarea")).to_have_count(0)
        expect(modal.get_by_role("button", name="正则匹配测试")).to_have_count(0)
        json_configuration_screen.cancel_modal(modal)
