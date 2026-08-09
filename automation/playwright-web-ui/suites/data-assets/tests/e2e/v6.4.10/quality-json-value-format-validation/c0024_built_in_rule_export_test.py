from __future__ import annotations

# ruff: noqa: INP001
from typing import TYPE_CHECKING

from playwright.sync_api import expect

from data_assets_playwright_web_ui.domains.data_quality.json_value_validation import (
    FEATURE_ID,
)
from playwright_web_ui import automation_case

if TYPE_CHECKING:
    from data_assets_playwright_web_ui.domains.data_quality.json_value_validation import (
        JsonValueValidationJourney,
    )
    from playwright_web_ui.pytest_plugin import StepFixture


@automation_case(
    project_id="data-assets",
    feature_id=FEATURE_ID,
    case_id="C0024",
)
def test_built_in_json_rule_fields_and_exported_workbook(
    json_value_journey: JsonValueValidationJourney,
    step: StepFixture,
) -> None:
    with step(
        action="在全局内置规则库搜索格式-json格式校验",
        expected="名称、解释、分类、范围和描述五个业务字段精确显示",
        target="规则库配置/内置规则",
    ):
        row = json_value_journey.screen.open_rule_base()
        for text in (
            "格式-json格式校验",
            "有效性校验",
            "字段",
            "校验json类型的字段中key对应的value值是否符合规范要求",
        ):
            expect(row).to_contain_text(text)
        expect(row.get_by_text("格式-json格式校验", exact=True)).to_have_count(2)
    with step(
        action="通过页面导出内置规则库并读取下载文件",
        expected="xlsx 中包含完整 JSON value 格式规则名称、分类、范围和描述",
        target="规则库导出文件",
    ):
        download_path = json_value_journey.screen.download_rule_library()
        json_value_journey.assertions.inspect_exported_rule_library(download_path)
