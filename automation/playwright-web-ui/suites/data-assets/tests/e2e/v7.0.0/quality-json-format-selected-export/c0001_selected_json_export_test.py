from __future__ import annotations

# ruff: noqa: INP001
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

    from data_assets_playwright_web_ui.domains.data_quality.json_configuration.screen import (
        JsonConfigurationScreen,
    )
    from playwright_web_ui.pytest_plugin import StepFixture


@automation_case(
    project_id="data-assets",
    feature_id="quality-json-format-selected-export",
    case_id="C0001",
)
def test_selected_json_export(
    json_configuration_screen: JsonConfigurationScreen,
    tmp_path: Path,
    step: StepFixture,
) -> None:
    with step(
        action="打开 JSON 格式校验列表并搜索 export",
        expected="exportA、exportB、exportC 均可见",
        target="JSON 配置列表",
    ):
        json_configuration_screen.open()
        json_configuration_screen.search("export")
        for key in ("exportA", "exportB", "exportC"):
            json_configuration_screen.expect_row(key)
    with step(
        action="仅勾选 exportA、exportB 后导出",
        expected="下载文件只包含两条被选记录",
        target="JSON 配置导出",
    ):
        json_configuration_screen.select_rows(("exportA", "exportB"))
        output_dir = tmp_path / "json-selected-export"
        output_dir.mkdir()
        path = json_configuration_screen.export(output_dir)
        assert_export_filename(path)
        inspection = JsonConfigurationWorkbook.inspect_export(path)
        exported_keys = tuple(row.get("key", "") for row in inspection.rows)
        assert exported_keys == ("exportA", "exportB")
