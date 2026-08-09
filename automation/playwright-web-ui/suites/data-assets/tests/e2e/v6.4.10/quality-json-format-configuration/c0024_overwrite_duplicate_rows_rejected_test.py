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
        JsonConfigurationScreen,
    )
    from playwright_web_ui.pytest_plugin import StepFixture


@automation_case(
    project_id="data-assets", feature_id="quality-json-format-configuration", case_id="C0024"
)
def test_overwrite_policy_rejects_duplicate_rows_in_same_level(
    json_configuration_screen: JsonConfigurationScreen,
    tmp_path: Path,
    step: StepFixture,
) -> None:
    workbook = JsonConfigurationWorkbook.build_import(
        tmp_path / "json_format_import_15696.xlsx",
        rows=(
            JsonImportRow(1, (), "dupKey", "重复键一", r"^[a-z]+$"),
            JsonImportRow(1, (), "dupKey", "重复键二", r"^[0-9]+$"),
        ),
    )
    with step(
        action="选择重复则覆盖更新并上传同层两个 dupKey",
        expected="导入失败并提示同一个层级下的 key 名不可重复，列表总数不变",
        target=workbook.name,
    ):
        json_configuration_screen.open()
        before_total = json_configuration_screen.total_count()
        modal = json_configuration_screen.open_import()
        json_configuration_screen.choose_import_policy(modal, DuplicatePolicy.OVERWRITE)
        json_configuration_screen.upload_with_file_chooser(modal, workbook)
        json_configuration_screen.submit_import_rejected(
            modal,
            message="同一个层级下的key名不可重复",
        )
        assert json_configuration_screen.total_count() == before_total
