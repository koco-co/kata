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
    project_id="data-assets", feature_id="quality-json-format-configuration", case_id="C0021"
)
def test_import_empty_required_key_marks_a2(
    json_configuration_screen: JsonConfigurationScreen,
    json_configuration_actions: JsonConfigurationActions,
    tmp_path: Path,
    step: StepFixture,
) -> None:
    workbook = JsonConfigurationWorkbook.build_import(
        tmp_path / "json_format_import_15696.xlsx",
        rows=(JsonImportRow(1, (), "", "缺失键名", r"^\d+$"),),
    )
    with step(
        action="上传一层 key 为空的 XLSX 并下载校验错误文件",
        expected="导入失败，错误文件的一层 A2 标红且批注为必填项未填写",
        target=workbook.name,
    ):
        json_configuration_screen.open()
        json_configuration_actions.import_workbook(
            workbook,
            policy=DuplicatePolicy.SKIP,
            expect_error=True,
        )
        error_file = json_configuration_screen.download_import_error(tmp_path / "downloads")
        inspection = JsonConfigurationWorkbook.inspect_error_coordinate(
            error_file,
            sheet_name="一层",
            coordinate="A2",
        )
        assert inspection.is_red
        assert inspection.comment is not None
        assert "必填项未填写" in inspection.comment
