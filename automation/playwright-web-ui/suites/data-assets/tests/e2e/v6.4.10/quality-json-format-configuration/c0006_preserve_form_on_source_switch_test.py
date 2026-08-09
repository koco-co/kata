from __future__ import annotations

# ruff: noqa: INP001, RUF001
from typing import TYPE_CHECKING

from playwright.sync_api import expect

from data_assets_playwright_web_ui.domains.data_quality.json_configuration.model import (
    DataSourceType,
    JsonKeyDraft,
)
from playwright_web_ui import automation_case

if TYPE_CHECKING:
    from data_assets_playwright_web_ui.domains.data_quality.json_configuration import (
        JsonConfigurationScreen,
    )
    from playwright_web_ui.pytest_plugin import StepFixture


@automation_case(
    project_id="data-assets", feature_id="quality-json-format-configuration", case_id="C0006"
)
def test_switching_source_preserves_other_form_values(
    json_configuration_screen: JsonConfigurationScreen,
    step: StepFixture,
) -> None:
    draft = JsonKeyDraft(
        key="switchTest",
        chinese_name="切换测试",
        value_format=r"^[a-z]+$",
        data_source_type=DataSourceType.SPARK_THRIFT,
    )
    with step(
        action="填写 key、中文名称和 value 格式后把数据源从 SparkThrift 切到 Hive",
        expected="数据源回显 Hive2.x，其他三个字段保持原值",
        target="新增 key 表单",
    ):
        json_configuration_screen.open()
        modal = json_configuration_screen.open_create()
        json_configuration_screen.fill_draft(modal, draft)
        json_configuration_screen.select_data_source(modal, DataSourceType.HIVE)
        expect(modal.locator("input#jsonKey")).to_have_value(draft.key)
        expect(modal.locator("input[id$='name']")).to_have_value(draft.chinese_name)
        expect(modal.locator("input[id$='value']")).to_have_value(draft.value_format)
        json_configuration_screen.cancel_modal(modal)
