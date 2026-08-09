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
    project_id="data-assets", feature_id="quality-json-format-configuration", case_id="C0003"
)
def test_key_over_255_is_blocked(
    json_configuration_screen: JsonConfigurationScreen,
    step: StepFixture,
) -> None:
    oversized_key = "a" * 256
    with step(
        action="在新增表单输入 256 字符 key 并提交",
        expected="显示 key 长度不能超过 255 个字符，弹窗不关闭且不提交",
        target="key 输入框",
    ):
        json_configuration_screen.open()
        modal = json_configuration_screen.open_create()
        json_configuration_screen.expect_key_validation(
            modal,
            value=oversized_key,
            message="key长度不能超过255个字符",
        )
