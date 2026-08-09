from __future__ import annotations

# ruff: noqa: INP001
from typing import TYPE_CHECKING

from data_assets_playwright_web_ui.domains.data_quality.json_configuration.model import JsonKeyDraft
from playwright_web_ui import automation_case

if TYPE_CHECKING:
    from data_assets_playwright_web_ui.domains.data_quality.json_configuration import (
        JsonConfigurationActions,
        JsonConfigurationScreen,
    )
    from playwright_web_ui.business_records import BusinessRecordRecorder
    from playwright_web_ui.pytest_plugin import StepFixture
    from playwright_web_ui.runtime_identity import AutomationRuntimeIdentity


@automation_case(
    project_id="data-assets", feature_id="quality-json-format-configuration", case_id="C0010"
)
def test_delete_parent_cascades_children(
    json_configuration_screen: JsonConfigurationScreen,
    json_configuration_actions: JsonConfigurationActions,
    automation_identity: AutomationRuntimeIdentity,
    business_records: BusinessRecordRecorder,
    step: StepFixture,
) -> None:
    parent = automation_identity.unique_name("deleteParent", max_length=46)
    child = automation_identity.unique_name("deleteChild", max_length=46)
    with step(
        action=f"通过 UI 创建父 key {parent} 及子 key {child}",
        expected="父行展开后可见子层级",
        target=parent,
    ):
        json_configuration_screen.open()
        json_configuration_actions.create_root(JsonKeyDraft(key=parent))
        json_configuration_actions.create_child(
            parent_key=parent,
            draft=JsonKeyDraft(key=child, data_source_type=None),
        )
    with step(
        action=f"删除含子层级的父 key {parent} 并确认联动删除",
        expected="父 key 和子 key 均无法再通过 UI 搜索到",
        target=parent,
    ):
        json_configuration_actions.delete(parent)
        json_configuration_screen.search(child)
        json_configuration_screen.expect_no_row(child)
    business_records.record(
        record_type="json-validation-key-deletion",
        record_id=parent,
        readback={"parent_absent": True, "child_key": child, "child_absent": True},
    )
