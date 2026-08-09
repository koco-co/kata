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
    project_id="data-assets", feature_id="quality-json-format-configuration", case_id="C0038"
)
def test_nonexistent_key_search_shows_true_zero_state(
    json_configuration_screen: JsonConfigurationScreen,
    step: StepFixture,
) -> None:
    keyword = "nonExistKeyXyz123"
    with step(
        action=f"在已有数据的列表搜索不存在的精确关键字 {keyword}",
        expected="展示“暂无数据”，没有业务行，分页总条数为 0",
        target=keyword,
    ):
        json_configuration_screen.open()
        assert json_configuration_screen.total_count() > 0
        json_configuration_screen.search(keyword)
        json_configuration_screen.expect_empty()
        assert json_configuration_screen.visible_business_row_count() == 0
