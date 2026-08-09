"""Composed synchronous Playwright surfaces for SQL-merge journeys."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

from .report_screen import SqlMergeReportScreen
from .result_screen import SqlMergeResultScreen
from .rule_set_screen import SqlMergeRuleSetScreen
from .rule_task_screen import SqlMergeRuleTaskScreen
from .screen_base import SqlMergeUiError
from .task_provisioning_screen import SqlMergeTaskProvisioningScreen

if TYPE_CHECKING:
    from data_assets_playwright_web_ui.components.navigation import DataAssetsNavigation


@dataclass(frozen=True, slots=True)
class SqlMergeOptimizationScreen:
    """Compose focused rule-task, result, and report UI capabilities."""

    navigation: DataAssetsNavigation

    @property
    def rule_tasks(self) -> SqlMergeRuleTaskScreen:
        """Return rule-task SQL and execution capabilities."""
        return SqlMergeRuleTaskScreen(self.navigation)

    @property
    def rule_sets(self) -> SqlMergeRuleSetScreen:
        """Return controlled rule-set provisioning capabilities."""
        return SqlMergeRuleSetScreen(self.navigation)

    @property
    def task_provisioning(self) -> SqlMergeTaskProvisioningScreen:
        """Return controlled rule-task provisioning capabilities."""
        return SqlMergeTaskProvisioningScreen(self.navigation)

    @property
    def results(self) -> SqlMergeResultScreen:
        """Return fresh-result and dirty-detail capabilities."""
        return SqlMergeResultScreen(self.navigation)

    @property
    def reports(self) -> SqlMergeReportScreen:
        """Return exact quality-report capabilities."""
        return SqlMergeReportScreen(self.navigation)


__all__ = ["SqlMergeOptimizationScreen", "SqlMergeUiError"]
