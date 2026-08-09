from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING, cast

from data_assets_playwright_web_ui.domains.data_quality.json_value_validation import (
    CASES,
    JsonValueValidationJourney,
)
from playwright_web_ui.manifest import CaseKey
from playwright_web_ui.runtime_identity import AutomationRuntimeIdentity

if TYPE_CHECKING:
    from playwright.sync_api import Locator

    from data_assets_playwright_web_ui.domains.data_quality.json_value_validation import (
        JsonValueAssertions,
        JsonValueCase,
        JsonValueValidationScreen,
    )
    from data_assets_playwright_web_ui.domains.data_quality.json_value_validation.model import (
        DatasourceKey,
    )


@dataclass(slots=True)
class _RuleScreen:
    package: object = field(default_factory=object)
    rule: object = field(default_factory=object)
    created: tuple[str, str, str] | None = None

    def open_rule_set_editor(
        self,
        case: JsonValueCase,
        datasource_key: DatasourceKey,
    ) -> Locator:
        del case, datasource_key
        return cast("Locator", self.package)

    def existing_json_rule(self, package: Locator) -> Locator:
        assert package is self.package
        return cast("Locator", self.rule)

    def create_rule_task(
        self,
        case: JsonValueCase,
        datasource_key: DatasourceKey,
        *,
        task_name: str,
        package_name: str,
    ) -> Locator:
        assert case.task_name == task_name
        self.created = (datasource_key, task_name, package_name)
        return cast("Locator", object())


@dataclass(slots=True)
class _RuleAssertions:
    checked: tuple[object, str, tuple[str, ...]] | None = None

    def expect_saved_rule(
        self,
        rule_form: Locator,
        *,
        field: str,
        keys: tuple[str, ...],
        description: str | None = None,
    ) -> None:
        assert description is None
        self.checked = (rule_form, field, keys)


def test_attempt_task_validates_existing_rule_and_uses_runtime_identity() -> None:
    case = CASES["C0016"]
    screen = _RuleScreen()
    assertions = _RuleAssertions()
    journey = JsonValueValidationJourney(
        screen=cast("JsonValueValidationScreen", screen),
        assertions=cast("JsonValueAssertions", assertions),
    )
    identity = AutomationRuntimeIdentity(
        case=CaseKey("data-assets", "quality-json-value-format-validation", "C0016"),
        logical_run_id="20260809-2000-preflight-01",
        execution_id="execution-01",
        executor_id="playwright-web-ui",
        attempt=1,
        worker_id="serial",
    )

    attempt_case = journey.create_attempt_task_from_existing_package(
        case,
        "sparkthrift",
        keys=("event-type",),
        automation_identity=identity,
    )

    assert attempt_case.task_name != case.task_name
    assert attempt_case.task_name.endswith(identity.collision_token)
    assert assertions.checked == (screen.rule, case.field_name, ("event-type",))
    assert screen.created == (
        "sparkthrift",
        attempt_case.task_name,
        case.package_name,
    )
