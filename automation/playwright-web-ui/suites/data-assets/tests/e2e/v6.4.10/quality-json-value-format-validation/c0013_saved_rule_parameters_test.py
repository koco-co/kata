from __future__ import annotations

# ruff: noqa: INP001
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
    from playwright_web_ui.pytest_plugin import StepFixture


@automation_case(
    project_id="data-assets",
    feature_id=FEATURE_ID,
    case_id="C0013",
)
def test_saved_rule_shows_all_canonical_parameters(
    json_value_journey: JsonValueValidationJourney,
    step: StepFixture,
) -> None:
    case = CASES["C0013"]
    for datasource_key in case.datasource_keys:
        with step(
            action=f"打开 {datasource_key} 已保存的 JSON value 格式规则",
            expected="字段级、info、规则名、person-name、强规则五项均完整回显",
            target=f"{case.table_name}/{case.package_name}",
        ):
            package = json_value_journey.screen.open_rule_set_editor(case, datasource_key)
            rule_form = json_value_journey.screen.existing_json_rule(package)
            json_value_journey.assertions.expect_saved_rule(
                rule_form,
                field="info",
                keys=("person-name",),
            )
