"""One-case controlled UI provisioning coordinator."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

from .write_models import ProvisionedWriteScenario, WriteScenario

if TYPE_CHECKING:
    from playwright_web_ui.runtime_identity import AutomationRuntimeIdentity

    from .rule_set_screen import SqlMergeRuleSetScreen
    from .task_provisioning_screen import SqlMergeTaskProvisioningScreen


@dataclass(frozen=True, slots=True)
class SqlMergeProvisioner:
    """Create and rebind one rule set and task using collision-safe runtime identity."""

    rule_sets: SqlMergeRuleSetScreen
    tasks: SqlMergeTaskProvisioningScreen

    def create(
        self,
        scenario: WriteScenario,
        *,
        identity: AutomationRuntimeIdentity,
    ) -> ProvisionedWriteScenario:
        """Provision every typed rule and task before SQL inspection or execution."""
        if scenario.rule_set is None or scenario.task is None:
            message = "write candidate must declare complete typed UI provisioning"
            raise ValueError(message)
        if scenario.seed_receipt is None:
            message = "write candidate must bind an attempt-owned Spark seed receipt"
            raise ValueError(message)
        names = scenario.materialize_names(identity)
        rule_set_id, rules = self.rule_sets.create(
            scenario=scenario,
            specification=scenario.rule_set,
            names=names,
        )
        monitor_id, monitor_rules = self.tasks.create(
            scenario=scenario,
            specification=scenario.task,
            names=names,
            rules=rules,
        )
        return ProvisionedWriteScenario(
            source=scenario,
            names=names,
            rule_set_id=rule_set_id,
            monitor_id=monitor_id,
            rules=monitor_rules,
        )
