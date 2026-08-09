from __future__ import annotations

# ruff: noqa: INP001, RUF001
from typing import TYPE_CHECKING

from playwright.sync_api import expect

from playwright_web_ui import automation_case

if TYPE_CHECKING:
    from data_assets_playwright_web_ui.domains.data_quality.json_configuration import (
        JsonConfigurationScreen,
    )
    from playwright_web_ui.pytest_plugin import StepFixture


@automation_case(
    project_id="data-assets", feature_id="quality-json-format-configuration", case_id="C0014"
)
def test_expand_five_levels_one_at_a_time(
    json_configuration_screen: JsonConfigurationScreen,
    step: StepFixture,
) -> None:
    levels = ("rootKey", "level2Key", "level3Key", "level4Key")
    with step(
        action="搜索 rootKey 并逐层点击四次展开图标",
        expected="每次只出现直接下一层，最终显示第 5 层 level5Key",
        target="五层 key 树",
    ):
        json_configuration_screen.open()
        json_configuration_screen.search("rootKey")
        for index, key in enumerate(levels, start=2):
            json_configuration_screen.expand(key)
            json_configuration_screen.expect_row(f"level{index}Key")
    with step(
        action="检查末层 level5Key 和无子层级 leafKey 的展开状态",
        expected="二者均无可展开图标且总条数按第一层统计",
        target="层级展开结果",
    ):
        level_five = json_configuration_screen.expect_row("level5Key")
        expect(level_five.locator(".ant-table-row-expand-icon-collapsed")).to_have_count(0)
        json_configuration_screen.clear_search()
        leaf = json_configuration_screen.expect_row("leafKey")
        expect(leaf.locator(".ant-table-row-expand-icon-collapsed")).to_have_count(0)
        assert json_configuration_screen.total_count() > 0
