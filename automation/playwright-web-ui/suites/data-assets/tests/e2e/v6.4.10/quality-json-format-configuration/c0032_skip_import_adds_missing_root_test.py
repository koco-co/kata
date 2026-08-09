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
    )
    from playwright_web_ui.business_records import BusinessRecordRecorder
    from playwright_web_ui.pytest_plugin import StepFixture
    from playwright_web_ui.runtime_identity import AutomationRuntimeIdentity


@automation_case(
    project_id="data-assets", feature_id="quality-json-format-configuration", case_id="C0032"
)
def test_skip_import_adds_missing_root(
    json_configuration_actions: JsonConfigurationActions,
    automation_identity: AutomationRuntimeIdentity,
    business_records: BusinessRecordRecorder,
    tmp_path: Path,
    step: StepFixture,
) -> None:
    json_configuration_screen = json_configuration_actions.screen
    key = automation_identity.unique_name("skipNewKey1", max_length=44)
    workbook = JsonConfigurationWorkbook.build_import(
        tmp_path / "json_format_import_15696.xlsx",
        rows=(JsonImportRow(1, (), key, "全新键", r"^\d+$"),),
    )
    with step(
        action=f"确认 {key} 不存在后，以重复则跳过策略导入",
        expected="不存在的 key 仍会新增，中文名称为全新键且 value 格式为 ^\\d+$",
        target=key,
    ):
        json_configuration_screen.open()
        json_configuration_screen.search(key)
        json_configuration_screen.expect_no_row(key)
        json_configuration_actions.import_workbook(workbook, policy=DuplicatePolicy.SKIP)
        json_configuration_screen.search(key)
        readback = json_configuration_screen.readback(key)
        assert readback.chinese_name == "全新键"
        assert readback.value_format == r"^\d+$"
        business_records.record(
            record_type="json-validation-import-create",
            record_id=key,
            readback=readback.business_payload(),
        )
