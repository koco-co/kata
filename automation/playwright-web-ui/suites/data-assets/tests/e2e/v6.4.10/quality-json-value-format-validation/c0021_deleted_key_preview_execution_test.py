from __future__ import annotations

# ruff: noqa: INP001, RUF001
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
    case_id="C0021",
)
def test_deleted_key_is_absent_from_preview_and_execution(
    json_value_journey: JsonValueValidationJourney,
    automation_identity: AutomationRuntimeIdentity,
    business_records: BusinessRecordRecorder,
    step: StepFixture,
) -> None:
    case = CASES["C0021"]
    selected_keys = ("preview-key-y",)
    readbacks: list[dict[str, str]] = []
    attempt_task_names: list[str] = []
    for datasource_key in case.datasource_keys:
        with step(
            action=f"打开 {datasource_key} 已删除 key 后的规则 value 格式预览",
            expected="仅显示 preview-key-y 及 ^[a-z]+$，preview-key-x 不出现",
            target=f"{case.table_name}/{case.package_name}",
        ):
            package = json_value_journey.screen.open_rule_set_editor(case, datasource_key)
            rule_form = json_value_journey.screen.existing_json_rule(package)
            preview = json_value_journey.screen.open_value_preview(rule_form)
            expect(preview.get_by_text("preview-key-y", exact=True)).to_be_visible()
            expect(preview).to_contain_text("^[a-z]+$")
            expect(preview.get_by_text("preview-key-x", exact=True)).to_have_count(0)
            preview.locator(".ant-modal-close").click()
        with step(
            action="复验既有规则包并创建、执行本 attempt 唯一任务",
            expected="唯一任务通过，详情仅引用 preview-key-y 且没有已删除 key 错误",
            target=case.package_name,
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
                result="通过",
                keys=selected_keys,
                field_type="string",
                failure_reason="--",
                detail_text='符合规则key为"preview-key-y"时的value格式要求',
                has_detail=False,
            )
            expect(result_view.detail).not_to_contain_text("preview-key-x")
            expect(result_view.detail).not_to_contain_text("引用已删除 key")
            readbacks.append(result_view.readback.as_json())
    business_records.record(
        record_type="json-value-task-result",
        record_id="|".join(attempt_task_names),
        readback={"attempt_tasks": attempt_task_names, "variants": readbacks},
    )
