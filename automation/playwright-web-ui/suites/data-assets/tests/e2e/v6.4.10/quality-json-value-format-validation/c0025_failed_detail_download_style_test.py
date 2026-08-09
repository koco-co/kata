from __future__ import annotations

# ruff: noqa: INP001, RUF001
from typing import TYPE_CHECKING

from data_assets_playwright_web_ui.domains.data_quality.json_value_validation import (
    CASES,
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
    case_id="C0025",
)
def test_failed_detail_download_marks_only_validated_field(
    json_value_journey: JsonValueValidationJourney,
    step: StepFixture,
) -> None:
    case = CASES["C0025"]
    selected_keys = ("product-code", "product-price")
    for datasource_key in case.datasource_keys:
        with step(
            action=f"打开 {datasource_key} 既有不通过实例及 JSON 规则明细",
            expected="规则字段完整，明细仅含 id=2 且 payload 标红",
            target=f"{case.table_name}/{case.task_name}",
        ):
            result_view = json_value_journey.open_result(
                case,
                datasource_key,
                terminal_text="已完成",
            )
            json_value_journey.assertions.expect_task_result(
                result_view.detail,
                result="不通过",
                keys=selected_keys,
                field_type="string",
                failure_reason="key对应value格式校验未通过",
                detail_text=('不符合规则key为"product-code;product-price"时的value格式要求'),
                has_detail=True,
            )
            dirty_drawer = json_value_journey.screen.results.open_dirty_detail(
                result_view.rule_card
            )
            json_value_journey.assertions.expect_dirty_ids(
                dirty_drawer,
                present=(2,),
                absent=(1,),
                highlighted_field="payload",
            )
        with step(
            action="从明细抽屉下载 xlsx 并解析内容与单元格样式",
            expected="列精确为 id、payload、name，仅 id=2 的 payload 单元格标红",
            target="校验不通过明细 Excel",
        ):
            download_path = json_value_journey.screen.results.download_dirty_data(dirty_drawer)
            json_value_journey.assertions.inspect_failed_detail_workbook(download_path)
