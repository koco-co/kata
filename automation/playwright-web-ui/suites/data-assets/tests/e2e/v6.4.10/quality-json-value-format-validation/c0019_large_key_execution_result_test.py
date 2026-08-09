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
    case_id="C0019",
)
def test_large_key_catalog_task_result_and_detail(
    json_value_journey: JsonValueValidationJourney,
    automation_identity: AutomationRuntimeIdentity,
    business_records: BusinessRecordRecorder,
    step: StepFixture,
) -> None:
    case = CASES["C0019"]
    selected_keys = ("perf-key-0001", "perf-key-0002")
    readbacks: list[dict[str, object]] = []
    attempt_task_names: list[str] = []
    for datasource_key in case.datasource_keys:
        with step(
            action=f"校验 {datasource_key} 大 key 规则包并创建、执行 attempt 唯一任务",
            expected="规则包回显目标 key，唯一任务的新实例完成且详情正常打开",
            target=f"{case.table_name}/{case.package_name}",
        ):
            attempt_case = json_value_journey.create_attempt_task_from_existing_package(
                case,
                datasource_key,
                keys=selected_keys,
                automation_identity=automation_identity,
            )
            attempt_task_names.append(attempt_case.task_name)
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
                detail_text=('不符合规则key为"perf-key-0001;perf-key-0002"时的value格式要求'),
                has_detail=True,
            )
        with step(
            action="打开大 key 场景的不通过记录明细",
            expected="仅 id=2 空值记录命中；id=1 和批量注入的有效记录均不命中",
            target="big_info 脏数据",
        ):
            dirty_drawer = json_value_journey.screen.results.open_dirty_detail(
                result_view.rule_card
            )
            dirty_ids = json_value_journey.assertions.expect_exact_dirty_ids(
                dirty_drawer,
                expected=frozenset({2}),
                highlighted_field="big_info",
            )
            readbacks.append(
                {
                    "task": result_view.readback.as_json(),
                    "dirty_ids": list(dirty_ids),
                },
            )
    business_records.record(
        record_type="json-value-task-result",
        record_id="|".join(attempt_task_names),
        readback={"attempt_tasks": attempt_task_names, "variants": readbacks},
    )
