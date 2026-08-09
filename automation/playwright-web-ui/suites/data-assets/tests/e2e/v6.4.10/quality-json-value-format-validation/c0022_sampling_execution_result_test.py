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
    case_id="C0022",
)
def test_half_sampling_reports_volume_and_permitted_business_outcome(
    json_value_journey: JsonValueValidationJourney,
    automation_identity: AutomationRuntimeIdentity,
    business_records: BusinessRecordRecorder,
    step: StepFixture,
) -> None:
    case = CASES["C0022"]
    selected_keys = ("sample-code",)
    readbacks: list[dict[str, object]] = []
    attempt_task_names: list[str] = []
    for datasource_key in case.datasource_keys:
        with step(
            action=f"校验 {datasource_key} 抽样规则包并创建、执行 attempt 唯一任务",
            expected="唯一任务的新实例完成，并明确展示 50% 与约 10 条参与校验",
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
            sampling = json_value_journey.assertions.expect_sampling_readback(
                result_view.detail,
                expected_ratio_percent=50,
                expected_validated_count=10,
            )
        dirty_ids: tuple[int, ...] = ()
        if result_view.readback.rule_result == "不通过":
            with step(
                action="读取抽中无效样本时的不通过规则与明细",
                expected="规则引用 sample-code，脏数据非空且仅可能为 id=11、12",
                target="抽样不通过结果",
            ):
                json_value_journey.assertions.expect_task_result(
                    result_view.detail,
                    result="不通过",
                    keys=selected_keys,
                    field_type="string",
                    failure_reason="key对应value格式校验未通过",
                    detail_text='不符合规则key为"sample-code"时的value格式要求',
                    has_detail=True,
                )
                dirty_drawer = json_value_journey.screen.results.open_dirty_detail(
                    result_view.rule_card,
                )
                dirty_ids = json_value_journey.assertions.expect_dirty_ids_within(
                    dirty_drawer,
                    allowed=frozenset({11, 12}),
                    highlighted_field="sample_info",
                )
        else:
            with step(
                action="读取未抽中无效样本时的通过规则",
                expected="规则引用 sample-code，结果通过、原因 -- 且无明细入口",
                target="抽样通过结果",
            ):
                json_value_journey.assertions.expect_task_result(
                    result_view.detail,
                    result="通过",
                    keys=selected_keys,
                    field_type="string",
                    failure_reason="--",
                    detail_text='符合规则key为"sample-code"时的value格式要求',
                    has_detail=False,
                )
        readbacks.append(
            {
                "task": result_view.readback.as_json(),
                "sampling": sampling.as_json(),
                "dirty_ids": list(dirty_ids),
            },
        )
    business_records.record(
        record_type="json-value-sampled-task-result",
        record_id="|".join(attempt_task_names),
        readback={"attempt_tasks": attempt_task_names, "variants": readbacks},
    )
