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
    case_id="C0014",
)
def test_passing_json_rule_set_task_and_result_flow(
    json_value_journey: JsonValueValidationJourney,
    automation_identity: AutomationRuntimeIdentity,
    business_records: BusinessRecordRecorder,
    step: StepFixture,
) -> None:
    case = CASES["C0014"]
    selected_keys = ("person-name", "person-age")
    readbacks: list[dict[str, str]] = []
    for datasource_key in case.datasource_keys:
        with step(
            action=f"在 {datasource_key} 新建独立规则集、JSON 规则和手动任务",
            expected="规则保存并回显两个层级 key，任务列表展示唯一 TaskA 实例",
            target=f"{case.table_name}/{case.package_name}",
        ):
            isolated_case, _task_row = json_value_journey.create_rule_set_and_task(
                case,
                datasource_key,
                keys=selected_keys,
                automation_identity=automation_identity,
            )
        with step(
            action="立即执行新建任务并打开本次最新已完成实例",
            expected="实例身份匹配本次唯一任务、表和数据源，状态为已完成",
            target=isolated_case.task_name,
        ):
            result_view = json_value_journey.execute_and_open_result(
                isolated_case,
                datasource_key,
                terminal_text="已完成",
            )
        with step(
            action="读取实例详情中的格式-json格式校验规则行",
            expected="字段类型 json、质检通过、原因 --、详情精确且无查看明细入口",
            target="实例监控报告",
        ):
            json_value_journey.assertions.expect_task_result(
                result_view.detail,
                result="通过",
                keys=selected_keys,
                field_type="json",
                failure_reason="--",
                detail_text='符合规则key为"person-name;person-age"时的value格式要求',
                has_detail=False,
            )
            readbacks.append(result_view.readback.as_json())
    business_records.record(
        record_type="json-value-task-result",
        record_id=f"{case.table_name}:{automation_identity.collision_token}",
        readback={"variants": readbacks},
    )
