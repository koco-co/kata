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
    case_id="C0015",
)
def test_failing_json_rule_set_task_and_dirty_detail_flow(
    json_value_journey: JsonValueValidationJourney,
    automation_identity: AutomationRuntimeIdentity,
    business_records: BusinessRecordRecorder,
    step: StepFixture,
) -> None:
    case = CASES["C0015"]
    selected_keys = ("order-amount", "order-status")
    readbacks: list[dict[str, str]] = []
    for datasource_key in case.datasource_keys:
        with step(
            action=f"在 {datasource_key} 新建不通过场景规则集和手动任务",
            expected="规则保存两个 order key，任务列表回显唯一任务、表和数据源",
            target=f"{case.table_name}/{case.package_name}",
        ):
            isolated_case, _task_row = json_value_journey.create_rule_set_and_task(
                case,
                datasource_key,
                keys=selected_keys,
                automation_identity=automation_identity,
            )
            result_view = json_value_journey.execute_and_open_result(
                isolated_case,
                datasource_key,
                terminal_text="已完成",
            )
        with step(
            action="读取不通过实例的 JSON 规则业务字段",
            expected="json、不通过、精确失败原因与详情均回显，并提供查看明细",
            target="实例监控报告",
        ):
            json_value_journey.assertions.expect_task_result(
                result_view.detail,
                result="不通过",
                keys=selected_keys,
                field_type="json",
                failure_reason="key对应value格式校验未通过",
                detail_text='不符合规则key为"order-amount;order-status"时的value格式要求',
                has_detail=True,
            )
        with step(
            action="打开格式-json格式校验明细",
            expected="仅 id=2、3 为脏数据，id=1 不出现且 order_info 单元格标红",
            target="不通过明细",
        ):
            dirty_drawer = json_value_journey.screen.results.open_dirty_detail(
                result_view.rule_card
            )
            json_value_journey.assertions.expect_dirty_ids(
                dirty_drawer,
                present=(2, 3),
                absent=(1,),
                highlighted_field="order_info",
            )
            readbacks.append(result_view.readback.as_json())
    business_records.record(
        record_type="json-value-task-result",
        record_id=f"{case.table_name}:{automation_identity.collision_token}",
        readback={"variants": readbacks},
    )
