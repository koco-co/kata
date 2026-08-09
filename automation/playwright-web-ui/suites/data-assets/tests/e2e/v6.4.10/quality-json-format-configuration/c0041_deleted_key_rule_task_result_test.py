from __future__ import annotations

# ruff: noqa: INP001, RUF001
from typing import TYPE_CHECKING

from playwright.sync_api import expect

from data_assets_playwright_web_ui.domains.data_quality.json_value_validation import (
    JsonValueCase,
)
from playwright_web_ui import automation_case

if TYPE_CHECKING:
    from data_assets_playwright_web_ui.domains.data_quality.json_configuration import (
        JsonConfigurationActions,
    )
    from data_assets_playwright_web_ui.domains.data_quality.json_value_validation import (
        JsonValueValidationJourney,
    )
    from playwright_web_ui.business_records import BusinessRecordRecorder
    from playwright_web_ui.pytest_plugin import StepFixture


@automation_case(
    project_id="data-assets", feature_id="quality-json-format-configuration", case_id="C0041"
)
def test_deleting_referenced_key_preserves_rules_and_passing_task_result(
    json_configuration_actions: JsonConfigurationActions,
    json_value_journey: JsonValueValidationJourney,
    business_records: BusinessRecordRecorder,
    step: StepFixture,
) -> None:
    key = "refTestKey"
    case = JsonValueCase(
        case_id="C0041",
        table_name="test_table_15696_c0041",
        package_name="json格式校验测试包",
        field_name="info",
        datasource_keys=("doris",),
        task_name="TaskA",
    )
    screen = json_configuration_actions.screen
    with step(
        action="读取 Doris3.x 的 refTestKey，并打开 RuleSetA 对应规则包核对引用",
        expected="key 值为 ^[a-zA-Z]+$；完整性 key范围校验与有效性 JSON 格式校验均引用它",
        target="refTestKey → RuleSetA/json格式校验测试包",
    ):
        screen.open()
        screen.search(key)
        key_before = screen.readback(key)
        assert key_before.value_format == r"^[a-zA-Z]+$"
        assert key_before.data_source_type == "Doris3.x"
        package = json_value_journey.screen.open_rule_set_editor(case, "doris")
        range_rule = (
            package.locator(".ruleForm")
            .filter(has_text="完整性校验")
            .filter(has_text="key范围校验")
            .first
        )
        expect(range_rule).to_be_visible()
        for expected in ("info", "包含", key, "强规则"):
            expect(range_rule).to_contain_text(expected)
        json_rule = json_value_journey.screen.existing_json_rule(package)
        json_value_journey.assertions.expect_saved_rule(
            json_rule,
            field="info",
            keys=(key,),
        )
    with step(
        action="返回 JSON 格式校验管理，通过级联确认浮层删除 refTestKey",
        expected="弹层关闭、列表刷新，精确搜索不再显示 refTestKey",
        target=key,
    ):
        screen.open()
        json_configuration_actions.delete(key)
    with step(
        action="重新打开 RuleSetA 的监控规则",
        expected=(
            "删除配置 key 后，两条规则仍回显原始字段、refTestKey、函数与强规则参数，且页面无报错"
        ),
        target="RuleSetA 规则 readback",
    ):
        package = json_value_journey.screen.open_rule_set_editor(case, "doris")
        range_rule = (
            package.locator(".ruleForm")
            .filter(has_text="完整性校验")
            .filter(has_text="key范围校验")
            .first
        )
        for expected in ("info", "包含", key, "强规则"):
            expect(range_rule).to_contain_text(expected)
        json_rule = json_value_journey.screen.existing_json_rule(package)
        json_value_journey.assertions.expect_saved_rule(
            json_rule,
            field="info",
            keys=(key,),
        )
    with step(
        action="在规则任务管理立即执行 TaskA，并打开本次最新已完成实例",
        expected="任务提交成功；实例身份匹配 TaskA/目标表/Doris，完整性与 JSON 规则结果均为通过",
        target="TaskA → 最新实例",
    ):
        task_row = json_value_journey.screen.open_rule_task_list(case, "doris")
        json_value_journey.screen.execute_task(task_row)
        result = json_value_journey.open_result(case, "doris", terminal_text="已完成")
        range_result = (
            result.detail.locator(".ruleView")
            .filter(has_text="完整性校验")
            .filter(has_text="key范围校验")
            .first
        )
        expect(range_result).to_be_visible()
        expect(range_result).to_contain_text(key)
        expect(range_result).to_contain_text("通过")
        json_value_journey.assertions.expect_task_result(
            result.detail,
            result="通过",
            keys=(key,),
            field_type="json",
            has_detail=False,
        )
        business_records.record(
            record_type="json-key-reference-task-result",
            record_id=result.readback.instance_id,
            readback={
                "deleted_key": key,
                "rule_set": "RuleSetA",
                "rule_package": case.package_name,
                "task": case.task_name,
                "table": case.table_name,
                "datasource": result.readback.datasource,
                "instance_id": result.readback.instance_id,
                "execute_time": result.readback.execute_time,
                "range_rule_result": "通过",
                "json_rule_result": result.readback.rule_result,
            },
        )
