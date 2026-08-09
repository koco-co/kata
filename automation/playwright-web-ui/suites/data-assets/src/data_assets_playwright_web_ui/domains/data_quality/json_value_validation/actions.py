"""Reusable business actions for JSON value-format validation cases."""

from __future__ import annotations

import re
from dataclasses import dataclass, replace
from typing import TYPE_CHECKING

from playwright.sync_api import expect

from .model import (
    DatasourceKey,
    JsonValueCase,
    RuleReadback,
    TaskInstanceIdentity,
    TaskResultReadback,
)

if TYPE_CHECKING:
    from re import Pattern

    from playwright.sync_api import Locator

    from playwright_web_ui.runtime_identity import AutomationRuntimeIdentity

    from .assertions import JsonValueAssertions
    from .screen import JsonValueValidationScreen


@dataclass(frozen=True, slots=True)
class TaskResultView:
    """One task result readback paired with its visible rule/detail containers."""

    detail: Locator
    rule_card: Locator
    readback: TaskResultReadback


@dataclass(frozen=True, slots=True)
class JsonValueValidationJourney:
    """Compose strict screen primitives into independent business capabilities."""

    screen: JsonValueValidationScreen
    assertions: JsonValueAssertions

    def unsaved_rule(
        self,
        case: JsonValueCase,
        datasource_key: DatasourceKey,
        *,
        field_name: str,
        select_json_function: bool = True,
    ) -> Locator:
        """Open a case-specific package and configure a new unsaved validity rule."""
        package = self.screen.open_rule_set_editor(case, datasource_key)
        rule_form = self.screen.add_validity_rule(package)
        self.screen.select_field(rule_form, field_name)
        if select_json_function:
            self.screen.select_json_function(rule_form)
        return rule_form

    def select_keys(self, rule_form: Locator, keys: tuple[str, ...]) -> None:
        """Select exact validation-key leaves and assert each resulting check state."""
        dropdown = self.screen.open_key_dropdown(rule_form)
        self.screen.expand_key_tree(dropdown)
        for key in keys:
            self.screen.select_key(dropdown, key)
        self.screen.close_dropdown()
        self.assertions.expect_selected_tags(self.screen.key_selector(rule_form), keys)

    def save_rule_in_existing_set(
        self,
        case: JsonValueCase,
        datasource_key: DatasourceKey,
        *,
        keys: tuple[str, ...],
        description: str,
    ) -> RuleReadback:
        """Add, save, reopen, and read back one isolated JSON-format rule."""
        form = self.unsaved_rule(
            case,
            datasource_key,
            field_name=case.field_name,
        )
        self.select_keys(form, keys)
        self.screen.set_rule_strength(form, "强规则")
        self.screen.fill_rule_description(form, description)
        self.screen.save_rule_set()
        package = self.screen.open_rule_set_editor(case, datasource_key)
        reopened = package.locator(".ruleForm").filter(has_text=description).first
        expect(reopened, "保存后必须能按唯一规则描述重新定位规则").to_be_visible()
        self.assertions.expect_saved_rule(
            reopened,
            field=case.field_name,
            keys=keys,
            description=description,
        )
        return RuleReadback(
            datasource=self.screen.datasource(datasource_key).name,
            table_name=case.table_name,
            package_name=case.package_name,
            field_name=case.field_name,
            selected_keys=keys,
            description=description,
        )

    def create_rule_set_and_task(
        self,
        case: JsonValueCase,
        datasource_key: DatasourceKey,
        *,
        keys: tuple[str, ...],
        automation_identity: AutomationRuntimeIdentity,
    ) -> tuple[JsonValueCase, Locator]:
        """Create an isolated rule set and task entirely through the target UI."""
        package_name = automation_identity.unique_name(case.package_name, max_length=50)
        task_name = automation_identity.unique_name(case.task_name, max_length=50)
        description = automation_identity.unique_name("JSONValue规则", max_length=50)
        package = self.screen.create_rule_set_draft(
            case,
            datasource_key,
            package_name=package_name,
        )
        form = self.screen.add_validity_rule(package)
        self.screen.select_field(form, case.field_name)
        self.screen.select_json_function(form)
        self.select_keys(form, keys)
        self.screen.set_rule_strength(form, "强规则")
        self.screen.fill_rule_description(form, description)
        self.screen.save_rule_set()
        isolated_case = replace(case, package_name=package_name, task_name=task_name)
        task_row = self.screen.create_rule_task(
            isolated_case,
            datasource_key,
            task_name=task_name,
            package_name=package_name,
        )
        return isolated_case, task_row

    def create_attempt_task_from_existing_package(
        self,
        case: JsonValueCase,
        datasource_key: DatasourceKey,
        *,
        keys: tuple[str, ...],
        automation_identity: AutomationRuntimeIdentity,
    ) -> JsonValueCase:
        """Validate an existing package, then reference it from an attempt-unique task."""
        package = self.screen.open_rule_set_editor(case, datasource_key)
        persisted_rule = self.screen.existing_json_rule(package)
        self.assertions.expect_saved_rule(
            persisted_rule,
            field=case.field_name,
            keys=keys,
        )
        task_name = automation_identity.unique_name(
            f"{case.task_name}-{datasource_key}",
            max_length=50,
        )
        attempt_case = replace(case, task_name=task_name)
        self.screen.create_rule_task(
            attempt_case,
            datasource_key,
            task_name=task_name,
            package_name=case.package_name,
        )
        return attempt_case

    def execute_and_open_result(
        self,
        case: JsonValueCase,
        datasource_key: DatasourceKey,
        *,
        terminal_text: str | Pattern[str],
    ) -> TaskResultView:
        """Execute a task and open only the new instance created by this submission."""
        baseline = self.screen.results.capture_result_baseline(case, datasource_key)
        task_row = self.screen.open_rule_task_list(case, datasource_key)
        self.screen.execute_task(task_row)
        detail, identity, status = self.screen.results.open_new_result(
            case,
            datasource_key,
            baseline=baseline,
            terminal_text=terminal_text,
        )
        return self._result_view(
            case,
            datasource_key,
            detail=detail,
            identity=identity,
            status=status,
        )

    def open_result(
        self,
        case: JsonValueCase,
        datasource_key: DatasourceKey,
        *,
        terminal_text: str | Pattern[str],
    ) -> TaskResultView:
        """Read the newest terminal task result without triggering another run."""
        detail, identity, status = self.screen.results.open_latest_result(
            case,
            datasource_key,
            terminal_text=terminal_text,
        )
        return self._result_view(
            case,
            datasource_key,
            detail=detail,
            identity=identity,
            status=status,
        )

    def _result_view(
        self,
        case: JsonValueCase,
        datasource_key: DatasourceKey,
        *,
        detail: Locator,
        identity: TaskInstanceIdentity,
        status: str,
    ) -> TaskResultView:
        """Build a business readback from one already identified visible instance."""
        rule_card = self.screen.results.json_rule_card(detail)
        card_text = rule_card.inner_text().strip()
        result = self._exact_rule_result(card_text)
        return TaskResultView(
            detail=detail,
            rule_card=rule_card,
            readback=TaskResultReadback(
                datasource=self.screen.datasource(datasource_key).name,
                task_name=case.task_name,
                table_name=case.table_name,
                instance_id=identity.instance_id,
                execute_time=identity.execute_time,
                status=status,
                rule_result=result,
                detail=card_text,
            ),
        )

    @staticmethod
    def _exact_rule_result(card_text: str) -> str:
        """Read pass/fail from an exact rendered status token with no default branch."""
        status_texts = tuple(line.strip() for line in card_text.splitlines() if line.strip())
        unpassed = any(
            status_text == "不通过" or re.fullmatch(r"校验未通过(?:\(\d+\))?", status_text)
            for status_text in status_texts
        )
        passed = any(
            status_text == "通过" or re.fullmatch(r"校验通过(?:\(\d+\))?", status_text)
            for status_text in status_texts
        )
        if unpassed == passed:
            message = f"JSON 规则卡片必须唯一展示通过或不通过状态。实际文本: {card_text!r}"
            raise ValueError(message)
        return "不通过" if unpassed else "通过"
