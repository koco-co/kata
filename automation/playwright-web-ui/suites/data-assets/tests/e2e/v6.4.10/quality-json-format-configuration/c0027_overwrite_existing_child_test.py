from __future__ import annotations

# ruff: noqa: INP001
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
    project_id="data-assets", feature_id="quality-json-format-configuration", case_id="C0027"
)
def test_overwrite_existing_child_updates_name_and_format(
    json_configuration_actions: JsonConfigurationActions,
    automation_identity: AutomationRuntimeIdentity,
    business_records: BusinessRecordRecorder,
    tmp_path: Path,
    step: StepFixture,
) -> None:
    json_configuration_screen = json_configuration_actions.screen
    parent = automation_identity.unique_name("parentA", max_length=39)
    child = automation_identity.unique_name("childA", max_length=39)
    workbook = JsonConfigurationWorkbook.build_import(
        tmp_path / "json_format_import_15696.xlsx",
        rows=(JsonImportRow(2, (parent,), child, "更新子键", r"^[0-9]+$"),),
    )
    with step(
        action=f"通过 UI 创建父 key {parent} 和 value 格式为空的子 key {child}",
        expected="展开父级后子 key 的 value 格式为空",
        target=child,
    ):
        json_configuration_screen.open()
        json_configuration_actions.create_root(JsonKeyDraft(key=parent))
        before = json_configuration_actions.create_child(
            parent_key=parent,
            draft=JsonKeyDraft(key=child, data_source_type=None),
        )
        assert before.value_format == ""
    with step(
        action="重复则覆盖更新导入相同父子路径",
        expected="展开父级后子 key 的中文名称和 value 格式均更新",
        target=child,
    ):
        json_configuration_actions.import_workbook(workbook, policy=DuplicatePolicy.OVERWRITE)
        json_configuration_screen.search(parent)
        json_configuration_screen.expand(parent)
        after = json_configuration_screen.readback(child)
        assert after.chinese_name == "更新子键"
        assert after.value_format == r"^[0-9]+$"
        business_records.record(
            record_type="json-validation-child-import-overwrite",
            record_id=child,
            readback={"parent_key": parent, **after.business_payload()},
        )
