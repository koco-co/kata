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
    case_id="C0008",
)
def test_saved_hierarchical_keys_are_read_back_exactly(
    json_value_journey: JsonValueValidationJourney,
    automation_identity: AutomationRuntimeIdentity,
    business_records: BusinessRecordRecorder,
    step: StepFixture,
) -> None:
    case = CASES["C0008"]
    selected_keys = ("person-name", "address-city")
    readbacks: list[dict[str, object]] = []
    for datasource_key in case.datasource_keys:
        description = automation_identity.unique_name(
            f"C0008层级key规则{datasource_key}",
            max_length=50,
        )
        with step(
            action=f"在 {datasource_key} 新增规则并保存两个层级 key",
            expected="保存成功，规则行用分号分隔回显 person-name;address-city",
            target=f"{case.table_name}/{case.package_name}",
        ):
            readback = json_value_journey.save_rule_in_existing_set(
                case,
                datasource_key,
                keys=selected_keys,
                description=description,
            )
            package = json_value_journey.screen.open_rule_set_editor(case, datasource_key)
            reopened = package.locator(".ruleForm").filter(has_text=description).first
            expect(reopened).to_contain_text("person-name;address-city")
        with step(
            action="重新展开已保存规则的校验 key 树",
            expected="person-name、address-city 勾选，person-age 未勾选",
            target="已保存规则校验 key",
        ):
            dropdown = json_value_journey.screen.open_key_dropdown(reopened)
            json_value_journey.screen.expand_key_tree(dropdown)
            for key_name in selected_keys:
                json_value_journey.assertions.expect_key_state(
                    json_value_journey.screen.key_node(dropdown, key_name),
                    checked=True,
                    disabled=False,
                )
            json_value_journey.assertions.expect_key_state(
                json_value_journey.screen.key_node(dropdown, "person-age"),
                checked=False,
                disabled=False,
            )
            json_value_journey.screen.close_dropdown()
            readbacks.append(readback.as_json())
    business_records.record(
        record_type="json-value-rule",
        record_id=f"{case.table_name}:{automation_identity.collision_token}",
        readback={"variants": readbacks},
    )
