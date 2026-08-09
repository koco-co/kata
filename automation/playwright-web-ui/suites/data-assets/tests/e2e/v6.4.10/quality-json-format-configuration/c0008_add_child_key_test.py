from __future__ import annotations

# ruff: noqa: INP001, RUF001
from typing import TYPE_CHECKING

from data_assets_playwright_web_ui.domains.data_quality.json_configuration.assertions import (
    assert_readback_matches,
)
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
    project_id="data-assets", feature_id="quality-json-format-configuration", case_id="C0008"
)
def test_add_child_key_and_expand_parent(
    json_configuration_screen: JsonConfigurationScreen,
    json_configuration_actions: JsonConfigurationActions,
    automation_identity: AutomationRuntimeIdentity,
    business_records: BusinessRecordRecorder,
    step: StepFixture,
) -> None:
    parent = automation_identity.unique_name("parentKey", max_length=42)
    child = automation_identity.unique_name("childKey", max_length=42)
    child_draft = JsonKeyDraft(
        key=child,
        chinese_name="子层级键",
        value_format=r"^[0-9]+$",
        data_source_type=None,
    )
    with step(
        action=f"先创建父 key {parent}，再从父行新增子层级 {child}",
        expected="子层级弹窗不含数据源类型，保存后父行可展开",
        target=parent,
    ):
        json_configuration_screen.open()
        json_configuration_actions.create_root(JsonKeyDraft(key=parent))
        child_readback = json_configuration_actions.create_child(
            parent_key=parent,
            draft=child_draft,
        )
    with step(
        action=f"展开父 key {parent} 并读取子层级 {child}",
        expected="子层级回显中文名称和 value 格式",
        target=child,
    ):
        assert_readback_matches(child_readback, child_draft)
        business_records.record(
            record_type="json-validation-child-key",
            record_id=child,
            readback={"parent_key": parent, **child_readback.business_payload()},
        )
