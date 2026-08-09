from __future__ import annotations

# ruff: noqa: INP001, RUF001
from typing import TYPE_CHECKING

from data_assets_playwright_web_ui.domains.data_quality.json_configuration.assertions import (
    assert_readback_matches,
)
from data_assets_playwright_web_ui.domains.data_quality.json_configuration.model import (
    DataSourceType,
    JsonKeyDraft,
)
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
    project_id="data-assets", feature_id="quality-json-format-configuration", case_id="C0007"
)
def test_edit_key_and_audit_fields(
    json_configuration_screen: JsonConfigurationScreen,
    json_configuration_actions: JsonConfigurationActions,
    automation_identity: AutomationRuntimeIdentity,
    business_records: BusinessRecordRecorder,
    step: StepFixture,
) -> None:
    original_key = automation_identity.unique_name("editTarget", max_length=42)
    updated_key = automation_identity.unique_name("editTargetV2", max_length=44)
    with step(
        action=f"通过 UI 创建待编辑 key {original_key}",
        expected="列表回显初始 SparkThrift2.x 记录和创建时间",
        target=original_key,
    ):
        json_configuration_screen.open()
        before = json_configuration_actions.create_root(JsonKeyDraft(key=original_key))
        assert before.created_at
    replacement = JsonKeyDraft(
        key=updated_key,
        value_format=r"^\d{4}$",
        data_source_type=DataSourceType.DORIS,
    )
    with step(
        action="编辑 key 名称、value 格式和数据源类型后保存",
        expected="旧 key 消失，新值持久化，更新人和更新时间非空且更新时间不早于创建时间",
        target=updated_key,
    ):
        after = json_configuration_actions.update(
            existing_key=original_key,
            replacement=replacement,
        )
        assert_readback_matches(after, replacement)
        assert after.updated_by
        assert after.updated_at
        assert after.updated_at >= before.created_at
        json_configuration_screen.search(original_key)
        json_configuration_screen.expect_no_row(original_key)
        business_records.record(
            record_type="json-validation-key",
            record_id=updated_key,
            readback=after.business_payload(),
        )
