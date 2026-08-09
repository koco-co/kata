from __future__ import annotations

# ruff: noqa: INP001, RUF001
import re
from datetime import datetime, timedelta
from typing import TYPE_CHECKING

from playwright.sync_api import expect

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
    case_id="C0023",
)
def test_previous_day_partition_is_the_only_validated_partition(
    json_value_journey: JsonValueValidationJourney,
    automation_identity: AutomationRuntimeIdentity,
    business_records: BusinessRecordRecorder,
    step: StepFixture,
) -> None:
    case = CASES["C0023"]
    selected_keys = ("part-code",)
    expected_partition = (datetime.now().astimezone().date() - timedelta(days=1)).isoformat()
    readbacks: list[dict[str, str]] = []
    attempt_task_names: list[str] = []
    for datasource_key in case.datasource_keys:
        with step(
            action=f"校验 {datasource_key} 分区规则包并创建、执行 attempt 唯一任务",
            expected="唯一任务的新实例完成，仅显示前一日分区和 2 条参与校验数据",
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
            expect(result_view.rule_card).to_contain_text("dt")
            expect(result_view.rule_card).to_contain_text(expected_partition)
            expect(result_view.detail).to_contain_text(
                re.compile(r"(?:参与校验|校验)(?:数据)?(?:量|条数)[^0-9]*2(?:\s*条)?"),
            )
            json_value_journey.assertions.expect_task_result(
                result_view.detail,
                result="不通过",
                keys=selected_keys,
                field_type="string",
                failure_reason="key对应value格式校验未通过",
                detail_text='不符合规则key为"part-code"时的value格式要求',
                has_detail=True,
            )
        with step(
            action="打开前一日分区的不通过记录明细",
            expected="id=2 命中；id=1 通过，今日分区 id=3、4 均未参与且不出现",
            target="part_info 分区脏数据",
        ):
            dirty_drawer = json_value_journey.screen.results.open_dirty_detail(
                result_view.rule_card
            )
            json_value_journey.assertions.expect_dirty_ids(
                dirty_drawer,
                present=(2,),
                absent=(1, 3, 4),
                highlighted_field="part_info",
            )
            readbacks.append(result_view.readback.as_json())
    business_records.record(
        record_type="json-value-partition-task-result",
        record_id="|".join(attempt_task_names),
        readback={
            "partition": expected_partition,
            "attempt_tasks": attempt_task_names,
            "variants": readbacks,
        },
    )
