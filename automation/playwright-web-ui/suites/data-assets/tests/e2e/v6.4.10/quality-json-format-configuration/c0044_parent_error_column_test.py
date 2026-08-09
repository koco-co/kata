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
    )
    from playwright_web_ui.pytest_plugin import StepFixture


@automation_case(
    project_id="data-assets", feature_id="quality-json-format-configuration", case_id="C0044"
)
def test_missing_parent_marks_parent_column_not_child_key_column(
    json_configuration_actions: JsonConfigurationActions,
    tmp_path: Path,
    step: StepFixture,
) -> None:
    parent, child = "illegalParent", "keyB"
    workbook = JsonConfigurationWorkbook.build_import(
        tmp_path / "json_format_import_15696.xlsx",
        rows=(
            JsonImportRow(1, (), "keyA", "中文名A", ""),
            JsonImportRow(2, (parent,), child, "中文名B", ""),
        ),
    )
    screen = json_configuration_actions.screen
    with step(
        action="上传五 Sheet XLSX：一层 keyA，二层 illegalParent/keyB，并以重复则跳过提交",
        expected="导入被拦截并提供符合命名契约的错误文件，不产生平台业务记录",
        target=workbook.name,
    ):
        screen.open()
        json_configuration_actions.import_workbook(
            workbook,
            policy=DuplicatePolicy.SKIP,
            expect_error=True,
        )
        error_file = screen.download_import_error(tmp_path / "downloads")
        assert_import_error_filename(error_file)
        parent_cell = JsonConfigurationWorkbook.inspect_error_coordinate(
            error_file,
            sheet_name="二层",
            coordinate="A2",
        )
        child_cell = JsonConfigurationWorkbook.inspect_error_coordinate(
            error_file,
            sheet_name="二层",
            coordinate="B2",
        )
        assert parent_cell.is_red
        assert parent_cell.comment is not None
        assert "上一层级无相同key名匹配" in parent_cell.comment
        assert not child_cell.is_red
        assert child_cell.comment is None
        screen.search(child)
        screen.expect_no_row(child)
