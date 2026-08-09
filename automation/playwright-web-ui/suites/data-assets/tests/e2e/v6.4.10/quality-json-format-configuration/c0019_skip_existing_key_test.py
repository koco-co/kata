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
    project_id="data-assets", feature_id="quality-json-format-configuration", case_id="C0019"
)
def test_skip_existing_key_keeps_original_value(
    json_configuration_screen: JsonConfigurationScreen,
    json_configuration_actions: JsonConfigurationActions,
    tmp_path: Path,
    step: StepFixture,
) -> None:
    workbook = JsonConfigurationWorkbook.build_import(
        tmp_path / "json_format_import_15696.xlsx",
        rows=(JsonImportRow(1, (), "skipKey", "跳过键", r"^[A-Z]+$"),),
    )
    with step(
        action="读取既有 skipKey 并用默认重复则跳过策略导入不同 value 格式",
        expected="导入完成后 skipKey 的 value 格式仍为 ^[a-z]+$",
        target="skipKey",
    ):
        json_configuration_screen.open()
        json_configuration_screen.search("skipKey")
        assert json_configuration_screen.readback("skipKey").value_format == r"^[a-z]+$"
        json_configuration_actions.import_workbook(workbook, policy=DuplicatePolicy.SKIP)
        json_configuration_screen.search("skipKey")
        assert json_configuration_screen.readback("skipKey").value_format == r"^[a-z]+$"
