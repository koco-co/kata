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
    from playwright_web_ui.business_records import BusinessRecordRecorder
    from playwright_web_ui.pytest_plugin import StepFixture
    from playwright_web_ui.runtime_identity import AutomationRuntimeIdentity


@automation_case(
    project_id="data-assets",
    feature_id=FEATURE_ID,
    case_id="C0017",
)
def test_doris_task_result_and_record_detail(
    json_value_journey: JsonValueValidationJourney,
    automation_identity: AutomationRuntimeIdentity,
    business_records: BusinessRecordRecorder,
    step: StepFixture,
) -> None:
    case = CASES["C0017"]
    datasource_key = "doris"
    selected_keys = ("item-sku",)
    with step(
        action="校验 Doris3.x 既有规则包并创建、执行本 attempt 唯一任务",
        expected="规则包回显 item-sku，唯一任务生成且仅打开该任务本次新实例",
        target=f"{case.table_name}/{case.package_name}",
    ):
        attempt_case = json_value_journey.create_attempt_task_from_existing_package(
            case,
            datasource_key,
            keys=selected_keys,
            automation_identity=automation_identity,
        )
        result_view = json_value_journey.execute_and_open_result(
            attempt_case,
            datasource_key,
            terminal_text="已完成",
        )
        json_value_journey.assertions.expect_task_result(
            result_view.detail,
            result="不通过",
            keys=selected_keys,
            field_type="json",
            failure_reason="key对应value格式校验未通过",
            detail_text='不符合规则key为"item-sku"时的value格式要求',
            has_detail=True,
        )
    with step(
        action="打开 Doris3.x 不通过明细",
        expected="仅 id=2 的 invalid_sku 记录出现，item_info 字段标红",
        target="item_info 脏数据",
    ):
        dirty_drawer = json_value_journey.screen.results.open_dirty_detail(result_view.rule_card)
        json_value_journey.assertions.expect_dirty_ids(
            dirty_drawer,
            present=(2,),
            absent=(1,),
            highlighted_field="item_info",
        )
    business_records.record(
        record_type="json-value-task-result",
        record_id=f"{attempt_case.task_name}:{result_view.readback.instance_id}",
        readback=result_view.readback.as_json(),
    )
