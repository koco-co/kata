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
    project_id="data-assets", feature_id="quality-json-format-configuration", case_id="C0009"
)
def test_fifth_level_disables_only_add_child(
    json_configuration_screen: JsonConfigurationScreen,
    step: StepFixture,
) -> None:
    hierarchy = ("level1Root", "level2Node", "level3Node", "level4Node")
    with step(
        action="搜索 level1Root 并逐层展开到第 5 层 level5Key",
        expected="每次只展开当前层级并最终显示 level5Key",
        target="五层 key 树",
    ):
        json_configuration_screen.open()
        json_configuration_screen.search(hierarchy[0])
        for key in hierarchy:
            json_configuration_screen.expand(key)
    with step(
        action="检查 level5Key 操作列",
        expected="新增子层级禁用且编辑、删除可用，末层无展开图标",
        target="level5Key",
    ):
        json_configuration_screen.expect_leaf_controls("level5Key")
