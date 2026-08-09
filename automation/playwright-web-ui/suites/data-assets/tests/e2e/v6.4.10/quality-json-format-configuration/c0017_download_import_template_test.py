from __future__ import annotations

# ruff: noqa: INP001, RUF001
from typing import TYPE_CHECKING

from data_assets_playwright_web_ui.domains.data_quality.json_configuration.workbook import (
    IMPORT_SHEET_NAMES,
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
    project_id="data-assets", feature_id="quality-json-format-configuration", case_id="C0017"
)
def test_download_import_template_has_five_exact_schemas(
    json_configuration_screen: JsonConfigurationScreen,
    tmp_path: Path,
    step: StepFixture,
) -> None:
    with step(
        action="打开导入弹窗并通过 Playwright download 下载模板",
        expected="下载文件名正确，且五个 Sheet 的父级链与业务表头顺序完全符合模板契约",
        target="下载模板",
    ):
        json_configuration_screen.open()
        modal = json_configuration_screen.open_import()
        downloaded = json_configuration_screen.download_template(modal, tmp_path)
        assert downloaded.name == "json_format_import_template.xlsx"
        inspection = JsonConfigurationWorkbook.inspect_template(downloaded)
        assert inspection.sheet_names == IMPORT_SHEET_NAMES
        assert inspection.headers == tuple(
            JsonConfigurationWorkbook.headers_for_level(level) for level in range(1, 6)
        )
