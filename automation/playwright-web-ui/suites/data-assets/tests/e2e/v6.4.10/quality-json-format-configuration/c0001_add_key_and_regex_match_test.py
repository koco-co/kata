from __future__ import annotations

# ruff: noqa: INP001
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
    project_id="data-assets", feature_id="quality-json-format-configuration", case_id="C0001"
)
def test_add_key_and_regex_match(
    json_configuration_screen: JsonConfigurationScreen,
    json_configuration_actions: JsonConfigurationActions,
    automation_identity: AutomationRuntimeIdentity,
    business_records: BusinessRecordRecorder,
    step: StepFixture,
) -> None:
    key = automation_identity.unique_name("userInfo", max_length=40)
    draft = JsonKeyDraft(
        key=key,
        chinese_name="用户信息",
        value_format=r"^[a-zA-Z]+$",
        data_source_type=DataSourceType.HIVE,
    )
    with step(
        action="进入 JSON 格式校验管理并检查完整列表列结构",
        expected="标题和九个业务列均可见",
        target="JSON 配置列表",
    ):
        json_configuration_screen.open()
        json_configuration_screen.expect_table_contract()
    with step(
        action=f"新增 key {key} 并用 testValue 执行正则匹配测试",
        expected="匹配成功且保存后列表回显 Hive2.x、中文名称、正则和创建人",
        target=key,
    ):
        readback = json_configuration_actions.create_root(draft, regex_test_data="testValue")
        assert_readback_matches(readback, draft, require_actor=True)
        business_records.record(
            record_type="json-validation-key",
            record_id=key,
            readback=readback.business_payload(),
        )
