from __future__ import annotations

# ruff: noqa: INP001
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
    project_id="data-assets", feature_id="quality-json-format-configuration", case_id="C0031"
)
def test_skip_existing_root_keeps_name_and_format(
    json_configuration_screen: JsonConfigurationScreen,
    json_configuration_actions: JsonConfigurationActions,
    tmp_path: Path,
    step: StepFixture,
) -> None:
    workbook = JsonConfigurationWorkbook.build_import(
        tmp_path / "json_format_import_15696.xlsx",
        rows=(JsonImportRow(1, (), "skipExist1", "修改键", r"^[A-Z]+$"),),
    )
    with step(
        action="读取既有 skipExist1 后以重复则跳过导入同名新值",
        expected="中文名称仍为原始键且 value 格式仍为 ^[a-z]+$",
        target="skipExist1",
    ):
        json_configuration_screen.open()
        json_configuration_screen.search("skipExist1")
        before = json_configuration_screen.readback("skipExist1")
        assert before.chinese_name == "原始键"
        assert before.value_format == r"^[a-z]+$"
        json_configuration_actions.import_workbook(workbook, policy=DuplicatePolicy.SKIP)
        json_configuration_screen.search("skipExist1")
        after = json_configuration_screen.readback("skipExist1")
        assert after.chinese_name == "原始键"
        assert after.value_format == r"^[a-z]+$"
