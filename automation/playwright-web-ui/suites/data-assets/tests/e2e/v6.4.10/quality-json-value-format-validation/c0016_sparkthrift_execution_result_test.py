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
    case_id="C0016",
)
def test_sparkthrift_task_result_and_record_detail(
    json_value_journey: JsonValueValidationJourney,
    automation_identity: AutomationRuntimeIdentity,
    business_records: BusinessRecordRecorder,
    step: StepFixture,
) -> None:
    case = CASES["C0016"]
    datasource_key = "sparkthrift"
    selected_keys = ("event-type",)
    with step(
        action="校验 SparkThrift2.x 既有规则包并创建、执行本 attempt 唯一任务",
        expected="规则包回显 event-type，唯一任务生成且仅打开该任务本次新实例",
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
            field_type="string",
            failure_reason="key对应value格式校验未通过",
            detail_text='不符合规则key为"event-type"时的value格式要求',
            has_detail=True,
        )
    with step(
        action="打开 SparkThrift2.x 不通过明细",
        expected="id=2 的 unknown 记录出现，id=1 不出现，event_data 字段标红",
        target="event_data 脏数据",
    ):
        dirty_drawer = json_value_journey.screen.results.open_dirty_detail(result_view.rule_card)
        json_value_journey.assertions.expect_dirty_ids(
            dirty_drawer,
            present=(2,),
            absent=(1,),
            highlighted_field="event_data",
        )
        invalid_field_value = json_value_journey.assertions.expect_dirty_field_value(
            dirty_drawer,
            record_id=2,
            field="event_data",
            invalid_value="unknown",
        )
    business_records.record(
        record_type="json-value-task-result",
        record_id=f"{attempt_case.task_name}:{result_view.readback.instance_id}",
        readback={
            "task": result_view.readback.as_json(),
            "invalid_record": {
                "id": 2,
                "field": "event_data",
                "ui_value": invalid_field_value,
            },
        },
    )
