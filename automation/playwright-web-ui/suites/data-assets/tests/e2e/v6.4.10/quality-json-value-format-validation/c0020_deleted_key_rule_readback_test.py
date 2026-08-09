from __future__ import annotations

# ruff: noqa: INP001, RUF001
from typing import TYPE_CHECKING

from playwright.sync_api import expect

from data_assets_playwright_web_ui.domains.data_quality.json_value_validation import (
    CASES,
    FEATURE_ID,
    RuleReadback,
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
    case_id="C0020",
)
def test_deleted_referenced_key_is_removed_and_rule_can_be_saved(
    json_value_journey: JsonValueValidationJourney,
    automation_identity: AutomationRuntimeIdentity,
    business_records: BusinessRecordRecorder,
    step: StepFixture,
) -> None:
    case = CASES["C0020"]
    readbacks: list[dict[str, object]] = []
    for datasource_key in case.datasource_keys:
        with step(
            action=f"在 {datasource_key} 类型配置列表删除 del-key-a",
            expected="级联影响确认后 del-key-a 消失，del-key-b 仍可查询",
            target="json格式校验管理",
        ):
            json_value_journey.screen.open_json_configuration()
            json_value_journey.screen.filter_json_configuration(datasource_key)
            json_value_journey.screen.delete_json_key("del-key-a")
        with step(
            action="打开引用该 key 的已保存规则并展开校验 key",
            expected="规则回显仅保留 del-key-b；a 不显示，b 仍勾选",
            target=f"{case.table_name}/{case.package_name}",
        ):
            package = json_value_journey.screen.open_rule_set_editor(case, datasource_key)
            rule_form = json_value_journey.screen.existing_json_rule(package)
            expect(rule_form).not_to_contain_text("del-key-a")
            expect(rule_form).to_contain_text("del-key-b")
            dropdown = json_value_journey.screen.open_key_dropdown(rule_form)
            json_value_journey.screen.expand_key_tree(dropdown)
            expect(dropdown.get_by_text("del-key-a", exact=True)).to_have_count(0)
            json_value_journey.assertions.expect_key_state(
                json_value_journey.screen.key_node(dropdown, "del-key-b"),
                checked=True,
                disabled=False,
            )
            json_value_journey.screen.close_dropdown()
        with step(
            action="保存规则集并重新打开引用规则",
            expected="保存成功且规则仍仅回显 del-key-b",
            target="删除关联后的规则持久化",
        ):
            json_value_journey.screen.save_rule_set()
            package = json_value_journey.screen.open_rule_set_editor(case, datasource_key)
            reopened = json_value_journey.screen.existing_json_rule(package)
            expect(reopened).to_contain_text("del-key-b")
            expect(reopened).not_to_contain_text("del-key-a")
            readbacks.append(
                RuleReadback(
                    datasource=json_value_journey.screen.datasource(datasource_key).name,
                    table_name=case.table_name,
                    package_name=case.package_name,
                    field_name="del_info",
                    selected_keys=("del-key-b",),
                ).as_json(),
            )
    business_records.record(
        record_type="json-value-rule",
        record_id=f"{case.table_name}:{automation_identity.collision_token}",
        readback={"variants": readbacks},
    )
