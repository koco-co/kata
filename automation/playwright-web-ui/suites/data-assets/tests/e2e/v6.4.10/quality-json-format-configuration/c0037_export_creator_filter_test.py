from __future__ import annotations

# ruff: noqa: INP001, RUF001
from typing import TYPE_CHECKING

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


@automation_case(
    project_id="data-assets", feature_id="quality-json-format-configuration", case_id="C0037"
)
def test_creator_filter_is_preserved_in_export(
    json_configuration_screen: JsonConfigurationScreen,
    tmp_path: Path,
    step: StepFixture,
) -> None:
    creator = "UserA"
    with step(
        action=f"在创建人列筛选 {creator}，核对 UI 后导出筛选结果",
        expected="UI 与 XLSX 均只含 UserA 创建的数据，且包含 exportKey1",
        target="创建人筛选导出",
    ):
        json_configuration_screen.open()
        json_configuration_screen.filter_creator(creator)
        visible = json_configuration_screen.visible_readbacks()
        assert visible
        assert all(row.created_by == creator for row in visible)
        downloaded = json_configuration_screen.export(tmp_path)
        rows = JsonConfigurationWorkbook.read_export(downloaded)
        assert rows
        assert all(row.get("创建人") == creator for row in rows)
        assert "exportKey1" in {row.get("key") for row in rows}
