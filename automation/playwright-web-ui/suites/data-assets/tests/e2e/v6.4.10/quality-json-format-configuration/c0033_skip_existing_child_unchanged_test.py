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
    project_id="data-assets", feature_id="quality-json-format-configuration", case_id="C0033"
)
def test_skip_existing_child_keeps_original_values(
    json_configuration_screen: JsonConfigurationScreen,
    json_configuration_actions: JsonConfigurationActions,
    tmp_path: Path,
    step: StepFixture,
) -> None:
    workbook = JsonConfigurationWorkbook.build_import(
        tmp_path / "json_format_import_15696.xlsx",
        rows=(JsonImportRow(2, ("parentC",), "childC", "修改子键", r"^[0-9]+$"),),
    )
    with step(
        action="读取 parentC/childC 后以重复则跳过导入相同子 key 的新值",
        expected="childC 的中文名称和空 value 格式均保持不变",
        target="childC",
    ):
        json_configuration_screen.open()
        json_configuration_screen.search("parentC")
        json_configuration_screen.expand("parentC")
        before = json_configuration_screen.readback("childC")
        assert before.value_format == ""
        json_configuration_actions.import_workbook(workbook, policy=DuplicatePolicy.SKIP)
        json_configuration_screen.search("parentC")
        json_configuration_screen.expand("parentC")
        after = json_configuration_screen.readback("childC")
        assert after.chinese_name == before.chinese_name
        assert after.value_format == ""
