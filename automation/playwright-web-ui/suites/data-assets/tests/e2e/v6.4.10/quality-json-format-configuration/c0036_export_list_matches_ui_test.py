from __future__ import annotations

# ruff: noqa: INP001, RUF001
from typing import TYPE_CHECKING

from data_assets_playwright_web_ui.domains.data_quality.json_configuration.assertions import (
    assert_export_filename,
)
from data_assets_playwright_web_ui.domains.data_quality.json_configuration.workbook import (
    JsonConfigurationWorkbook,
)
from playwright_web_ui import automation_case

if TYPE_CHECKING:
    from pathlib import Path

    from data_assets_playwright_web_ui.domains.data_quality.json_configuration import (
        JsonConfigurationScreen,
    )
    from playwright_web_ui.pytest_plugin import StepFixture

_EXPECTED_HEADERS = (
    "key",
    "中文名称",
    "value 格式",
    "数据源类型",
    "创建人",
    "创建时间",
    "更新人",
    "更新时间",
    "层级关系",
)
_MINIMUM_EXISTING_ROWS = 2


@automation_case(
    project_id="data-assets", feature_id="quality-json-format-configuration", case_id="C0036"
)
def test_export_filename_schema_and_rows_match_visible_list(
    json_configuration_screen: JsonConfigurationScreen,
    tmp_path: Path,
    step: StepFixture,
) -> None:
    with step(
        action="读取至少两条 JSON key 列表记录后，通过确认浮层导出当前列表",
        expected="下载文件名符合当天命名，九列表头顺序固定且可见业务值与 UI 一致",
        target="json格式校验管理导出",
    ):
        json_configuration_screen.open()
        assert json_configuration_screen.total_count() >= _MINIMUM_EXISTING_ROWS
        visible = json_configuration_screen.visible_readbacks()
        assert len(visible) >= _MINIMUM_EXISTING_ROWS
        downloaded = json_configuration_screen.export(tmp_path)
        assert_export_filename(downloaded)
        inspection = JsonConfigurationWorkbook.inspect_export(downloaded)
        assert inspection.headers == _EXPECTED_HEADERS
        by_key = {row["key"]: row for row in inspection.rows}
        for expected in visible[:2]:
            actual = by_key[expected.key]
            assert actual["中文名称"] == expected.chinese_name
            assert actual["value 格式"] == expected.value_format
            assert actual["数据源类型"] == expected.data_source_type
            assert actual["创建人"] == expected.created_by
            assert actual["创建时间"] == expected.created_at
            assert actual["更新人"] == expected.updated_by
            assert actual["更新时间"] == expected.updated_at
