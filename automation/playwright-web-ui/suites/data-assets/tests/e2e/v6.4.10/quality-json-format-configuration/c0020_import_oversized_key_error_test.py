from __future__ import annotations

# ruff: noqa: INP001, RUF001
from typing import TYPE_CHECKING

from data_assets_playwright_web_ui.domains.data_quality.json_configuration.assertions import (
    assert_import_error_filename,
)
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
    project_id="data-assets", feature_id="quality-json-format-configuration", case_id="C0020"
)
def test_import_oversized_key_marks_error_cell(
    json_configuration_screen: JsonConfigurationScreen,
    json_configuration_actions: JsonConfigurationActions,
    tmp_path: Path,
    step: StepFixture,
) -> None:
    oversized = "b" * 256
    workbook = JsonConfigurationWorkbook.build_import(
        tmp_path / "json_format_import_15696.xlsx",
        rows=(JsonImportRow(1, (), oversized, "超限测试", ""),),
    )
    with step(
        action="上传包含 256 字符 key 的 XLSX 并提交校验",
        expected="导入被拦截，下载的错误文件将该 key 单元格标红并批注明确长度超限",
        target=workbook.name,
    ):
        json_configuration_screen.open()
        json_configuration_actions.import_workbook(
            workbook,
            policy=DuplicatePolicy.SKIP,
            expect_error=True,
        )
        error_file = json_configuration_screen.download_import_error(tmp_path / "downloads")
        assert_import_error_filename(error_file)
        inspection = JsonConfigurationWorkbook.inspect_error_cell(
            error_file,
            sheet_name="一层",
            value=oversized,
        )
        assert inspection.is_red
        assert inspection.comment is not None
        assert "长度" in inspection.comment
