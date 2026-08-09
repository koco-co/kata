from __future__ import annotations

# ruff: noqa: INP001
from typing import TYPE_CHECKING

from data_assets_playwright_web_ui.domains.data_quality.json_configuration.model import (
    DataSourceType,
)
from playwright_web_ui import automation_case

if TYPE_CHECKING:
    from data_assets_playwright_web_ui.domains.data_quality.json_configuration import (
        JsonConfigurationScreen,
    )
    from playwright_web_ui.pytest_plugin import StepFixture


@automation_case(
    project_id="data-assets", feature_id="quality-json-format-configuration", case_id="C0013"
)
def test_filter_by_each_data_source_type(
    json_configuration_screen: JsonConfigurationScreen,
    step: StepFixture,
) -> None:
    with step(
        action="依次选择 SparkThrift2.x、Hive2.x、Doris3.x 数据源筛选",
        expected="每个筛选结果非空且所有可见行的数据源类型都与所选值一致",
        target="数据源类型筛选",
    ):
        json_configuration_screen.open()
        for source_type in DataSourceType:
            json_configuration_screen.filter_data_source(source_type)
            rows = json_configuration_screen.visible_readbacks()
            assert rows
            assert all(row.data_source_type == source_type.value for row in rows)
            json_configuration_screen.clear_data_source_filter()
        assert json_configuration_screen.total_count() > 0
