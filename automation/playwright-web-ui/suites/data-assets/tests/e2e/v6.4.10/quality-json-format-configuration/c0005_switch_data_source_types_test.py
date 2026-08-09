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
        JsonConfigurationScreen,
    )
    from playwright_web_ui.business_records import BusinessRecordRecorder
    from playwright_web_ui.pytest_plugin import StepFixture
    from playwright_web_ui.runtime_identity import AutomationRuntimeIdentity


@automation_case(
    project_id="data-assets", feature_id="quality-json-format-configuration", case_id="C0005"
)
def test_switch_data_source_types_and_persist_doris(
    json_configuration_screen: JsonConfigurationScreen,
    automation_identity: AutomationRuntimeIdentity,
    business_records: BusinessRecordRecorder,
    step: StepFixture,
) -> None:
    key = automation_identity.unique_name("typeTestKey", max_length=45)
    draft = JsonKeyDraft(key=key, data_source_type=DataSourceType.DORIS)
    json_configuration_screen.open()
    modal = json_configuration_screen.open_create()
    with step(
        action="打开新增数据源类型下拉并依次选择 Hive、Doris、SparkThrift",
        expected="默认值为 SparkThrift2.x 且只有三种受支持选项，每次切换均回显",
        target="数据源类型下拉",
    ):
        assert json_configuration_screen.data_source_choices(modal) == tuple(
            item.value for item in DataSourceType
        )
        for source_type in (DataSourceType.HIVE, DataSourceType.DORIS, DataSourceType.SPARK_THRIFT):
            json_configuration_screen.select_data_source(modal, source_type)
    with step(
        action=f"填写 {key}，最终选择 Doris3.x 后保存",
        expected="列表新增记录并回显 Doris3.x",
        target=key,
    ):
        json_configuration_screen.fill_draft(modal, draft)
        json_configuration_screen.confirm_modal(modal)
        json_configuration_screen.search(key)
        readback = json_configuration_screen.readback(key)
        assert_readback_matches(readback, draft)
        business_records.record(
            record_type="json-validation-key",
            record_id=key,
            readback=readback.business_payload(),
        )
