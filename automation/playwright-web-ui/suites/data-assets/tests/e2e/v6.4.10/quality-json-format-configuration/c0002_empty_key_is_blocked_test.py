from __future__ import annotations

# ruff: noqa: INP001, RUF001
from typing import TYPE_CHECKING

from playwright_web_ui import automation_case

if TYPE_CHECKING:
    from data_assets_playwright_web_ui.domains.data_quality.json_configuration import (
        JsonConfigurationScreen,
    )
    from playwright_web_ui.pytest_plugin import StepFixture


@automation_case(
    project_id="data-assets", feature_id="quality-json-format-configuration", case_id="C0002"
)
def test_empty_key_is_blocked(
    json_configuration_screen: JsonConfigurationScreen,
    step: StepFixture,
) -> None:
    with step(
        action="打开新增弹窗并保持 key 为空后提交",
        expected="显示请输入key，弹窗保持打开且没有提交数据",
        target="新增 key 表单",
    ):
        json_configuration_screen.open()
        modal = json_configuration_screen.open_create()
        json_configuration_screen.expect_key_validation(modal, value="", message="请输入key")
