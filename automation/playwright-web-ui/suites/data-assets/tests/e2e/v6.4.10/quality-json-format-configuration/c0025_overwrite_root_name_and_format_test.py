from __future__ import annotations

# ruff: noqa: INP001, RUF001
from typing import TYPE_CHECKING

from data_assets_playwright_web_ui.domains.data_quality.json_configuration.model import (
    DuplicatePolicy,
    JsonImportRow,
    JsonKeyDraft,
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
    project_id="data-assets", feature_id="quality-json-format-configuration", case_id="C0025"
)
def test_overwrite_root_updates_name_and_format(
    json_configuration_actions: JsonConfigurationActions,
    automation_identity: AutomationRuntimeIdentity,
    business_records: BusinessRecordRecorder,
    tmp_path: Path,
    step: StepFixture,
) -> None:
    json_configuration_screen = json_configuration_actions.screen
    key = automation_identity.unique_name("existKey1", max_length=42)
    workbook = JsonConfigurationWorkbook.build_import(
        tmp_path / "json_format_import_15696.xlsx",
        rows=(JsonImportRow(1, (), key, "更新键", r"^[A-Z]+$"),),
    )
    with step(
        action=f"创建 {key}，中文名称为原始键且 value 格式为 ^[a-z]+$",
        expected="列表完整回显初始值",
        target=key,
    ):
        json_configuration_screen.open()
        json_configuration_actions.create_root(
            JsonKeyDraft(key=key, chinese_name="原始键", value_format=r"^[a-z]+$")
        )
    with step(
        action="重复则覆盖更新导入相同 key 的新中文名和 value 格式",
        expected="列表回显中文名称更新键和 value 格式 ^[A-Z]+$",
        target=key,
    ):
        json_configuration_actions.import_workbook(workbook, policy=DuplicatePolicy.OVERWRITE)
        json_configuration_screen.search(key)
        readback = json_configuration_screen.readback(key)
        assert readback.chinese_name == "更新键"
        assert readback.value_format == r"^[A-Z]+$"
        business_records.record(
            record_type="json-validation-import-overwrite",
            record_id=key,
            readback=readback.business_payload(),
        )
