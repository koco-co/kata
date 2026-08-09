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
    project_id="data-assets", feature_id="quality-json-format-configuration", case_id="C0012"
)
def test_fuzzy_search_matches_root_and_child(
    json_configuration_screen: JsonConfigurationScreen,
    step: StepFixture,
) -> None:
    with step(
        action="按 orderInfo 模糊搜索第一层 key",
        expected="仅显示 key 名含 orderInfo 的第一层记录",
        target="key 搜索",
    ):
        json_configuration_screen.open()
        json_configuration_screen.search("orderInfo")
        roots = json_configuration_screen.visible_readbacks()
        assert roots
        assert all("orderInfo" in row.key for row in roots)
    with step(
        action="清空后按子层级 key orderStatus 搜索并展开父级 orderInfo",
        expected="搜索命中父级，展开后可见 orderStatus 子层级，清空后恢复全量",
        target="orderStatus",
    ):
        json_configuration_screen.clear_search()
        json_configuration_screen.search("orderStatus")
        json_configuration_screen.expect_row("orderInfo")
        json_configuration_screen.expand("orderInfo")
        json_configuration_screen.expect_row("orderStatus")
        json_configuration_screen.clear_search()
        assert json_configuration_screen.total_count() > 0
