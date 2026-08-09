from __future__ import annotations

# ruff: noqa: INP001, RUF001
from typing import TYPE_CHECKING

from data_assets_playwright_web_ui.domains.data_quality.json_configuration.model import (
    DuplicatePolicy,
    JsonImportRow,
)
from data_assets_playwright_web_ui.domains.data_quality.json_configuration.workbook import (
    JsonConfigurationWorkbook,
)
from playwright_web_ui import automation_case

if TYPE_CHECKING:
    from pathlib import Path

    from data_assets_playwright_web_ui.domains.data_quality.json_configuration import (
        JsonConfigurationActions,
        JsonConfigurationScreen,
    )
    from playwright_web_ui.pytest_plugin import StepFixture


@automation_case(
    project_id="data-assets", feature_id="quality-json-format-configuration", case_id="C0022"
)
def test_import_missing_parent_marks_parent_cell(
    json_configuration_screen: JsonConfigurationScreen,
    json_configuration_actions: JsonConfigurationActions,
    tmp_path: Path,
    step: StepFixture,
) -> None:
    parent = "nonExistParentKey"
    workbook = JsonConfigurationWorkbook.build_import(
        tmp_path / "json_format_import_15696.xlsx",
        rows=(
            JsonImportRow(1, (), "realKey1", "真实键", ""),
            JsonImportRow(2, (parent,), "orphanKey", "孤儿键", ""),
        ),
    )
    with step(
        action=f"上传二层父 key 为 {parent} 的 XLSX 并下载错误文件",
        expected="导入被拦截，错误文件中父级单元格标红并批注上一层级无匹配 key",
        target=workbook.name,
    ):
        json_configuration_screen.open()
        json_configuration_actions.import_workbook(
            workbook,
            policy=DuplicatePolicy.SKIP,
            expect_error=True,
        )
        error_file = json_configuration_screen.download_import_error(tmp_path / "downloads")
        inspection = JsonConfigurationWorkbook.inspect_error_cell(
            error_file,
            sheet_name="二层",
            value=parent,
        )
        assert inspection.is_red
        assert inspection.comment is not None
        assert "上一层级无相同key名匹配" in inspection.comment
