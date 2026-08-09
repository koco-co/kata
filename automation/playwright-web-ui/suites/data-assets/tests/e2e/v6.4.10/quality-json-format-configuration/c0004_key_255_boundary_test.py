from __future__ import annotations

# ruff: noqa: INP001
from typing import TYPE_CHECKING

from data_assets_playwright_web_ui.domains.data_quality.json_configuration.assertions import (
    assert_readback_matches,
)
from data_assets_playwright_web_ui.domains.data_quality.json_configuration.model import JsonKeyDraft
from playwright_web_ui import automation_case

_KEY_MAX_LENGTH = 255

if TYPE_CHECKING:
    from data_assets_playwright_web_ui.domains.data_quality.json_configuration import (
        JsonConfigurationActions,
        JsonConfigurationScreen,
    )
    from playwright_web_ui.business_records import BusinessRecordRecorder
    from playwright_web_ui.pytest_plugin import StepFixture
    from playwright_web_ui.runtime_identity import AutomationRuntimeIdentity


@automation_case(
    project_id="data-assets", feature_id="quality-json-format-configuration", case_id="C0004"
)
def test_key_255_boundary_is_persisted(
    json_configuration_screen: JsonConfigurationScreen,
    json_configuration_actions: JsonConfigurationActions,
    automation_identity: AutomationRuntimeIdentity,
    business_records: BusinessRecordRecorder,
    step: StepFixture,
) -> None:
    key = automation_identity.unique_name("a" * 243, max_length=_KEY_MAX_LENGTH)
    assert len(key) == _KEY_MAX_LENGTH
    draft = JsonKeyDraft(key=key)
    with step(
        action="新增长度恰好为 255 字符的唯一 key",
        expected="提交成功且列表完整回显 255 字符 key",
        target="255 字符 key",
    ):
        json_configuration_screen.open()
        readback = json_configuration_actions.create_root(draft)
        assert_readback_matches(readback, draft)
        business_records.record(
            record_type="json-validation-key",
            record_id=key,
            readback=readback.business_payload(),
        )
