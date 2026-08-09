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
    project_id="data-assets", feature_id="quality-json-format-configuration", case_id="C0035"
)
def test_skip_missing_parent_does_not_import_orphan(
    json_configuration_screen: JsonConfigurationScreen,
    json_configuration_actions: JsonConfigurationActions,
    tmp_path: Path,
    step: StepFixture,
) -> None:
    parent, orphan = "noParent", "orphanKey2"
    workbook = JsonConfigurationWorkbook.build_import(
        tmp_path / "json_format_import_15696.xlsx",
        rows=(JsonImportRow(2, (parent,), orphan, "孤儿键", r"^test$"),),
    )
    with step(
        action="保持重复则跳过并导入缺失父级的二层 key",
        expected="导入失败并提供错误文件，孤儿 key 不写入平台",
        target=orphan,
    ):
        json_configuration_screen.open()
        json_configuration_screen.search(parent)
        json_configuration_screen.expect_no_row(parent)
        json_configuration_actions.import_workbook(
            workbook,
            policy=DuplicatePolicy.SKIP,
            expect_error=True,
        )
        json_configuration_screen.search(orphan)
        json_configuration_screen.expect_no_row(orphan)
