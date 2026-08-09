from __future__ import annotations

# ruff: noqa: INP001, RUF001
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
    project_id="data-assets", feature_id="quality-json-format-configuration", case_id="C0011"
)
def test_batch_delete_two_roots_and_child(
    json_configuration_screen: JsonConfigurationScreen,
    json_configuration_actions: JsonConfigurationActions,
    automation_identity: AutomationRuntimeIdentity,
    business_records: BusinessRecordRecorder,
    step: StepFixture,
) -> None:
    prefix = automation_identity.unique_name("batchKey", max_length=40)
    first, second, child = f"{prefix}1", f"{prefix}2", f"{prefix}Child"
    with step(
        action="通过 UI 创建两个根 key，并为第一个根 key 创建子层级",
        expected="按共同前缀搜索可见两个根记录，第一个根可展开子层级",
        target=prefix,
    ):
        json_configuration_screen.open()
        json_configuration_actions.create_root(JsonKeyDraft(key=first))
        json_configuration_actions.create_root(JsonKeyDraft(key=second))
        json_configuration_actions.create_child(
            parent_key=first,
            draft=JsonKeyDraft(key=child, data_source_type=None),
        )
        json_configuration_screen.search(prefix)
        json_configuration_screen.expect_row(first)
        json_configuration_screen.expect_row(second)
    with step(
        action="勾选两个根记录并执行批量删除",
        expected="批量确认提示联动删除，两个根记录和子记录均消失",
        target="批量删除",
    ):
        json_configuration_screen.select_rows((first, second))
        json_configuration_screen.batch_delete_selected()
        for key in (first, second, child):
            json_configuration_screen.search(key)
            json_configuration_screen.expect_no_row(key)
    business_records.record(
        record_type="json-validation-batch-deletion",
        record_id=prefix,
        readback={"deleted_keys": [first, second, child], "all_absent": True},
    )
