"""Business actions shared by explicit SQL-merge canonical test items."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Final

from data_assets_playwright_web_ui.domains.data_quality.sql_merge_optimization.assertions import (
    SqlTopologyReadback,
    assert_download_matches_visible_rows,
    assert_shared_dirty_table,
    assert_sql_topology,
    read_xlsx_snapshot,
)
from data_assets_playwright_web_ui.domains.data_quality.sql_merge_optimization.provisioning import (
    SqlMergeProvisioner,
)
from data_assets_playwright_web_ui.domains.data_quality.sql_merge_optimization.screen_base import (
    SqlMergeUiError,
)

if TYPE_CHECKING:
    from playwright.sync_api import Locator

    from data_assets_playwright_web_ui.domains.data_quality.sql_merge_optimization.model import (
        ProvisionedWriteScenario,
        ReadOnlyScenario,
        TableSnapshot,
        TaskExecutionReadback,
        WriteScenario,
    )
    from data_assets_playwright_web_ui.domains.data_quality.sql_merge_optimization.screen import (
        SqlMergeOptimizationScreen,
    )
    from playwright_web_ui.runtime_identity import AutomationRuntimeIdentity


MULTI_STAGE_REVISION_CODE: Final = "SQL_MERGE_MULTI_STAGE_REVISION_UNIMPLEMENTED"
READ_ONLY_FIXTURE_IDENTITY_CODE: Final = "READ_ONLY_FIXTURE_IDENTITY_MISSING"


@dataclass(frozen=True, slots=True)
class SqlMergeReadOnlyActions:
    """Compose strong read-only checkpoints without selecting behavior by case ID."""

    screen: SqlMergeOptimizationScreen
    identity: AutomationRuntimeIdentity

    def verify_identity(self, scenario: ReadOnlyScenario) -> None:
        """Bind the explicit scenario to the immutable manifest item."""
        key = self.identity.case
        actual = (key.project_id, key.feature_id, key.case_id)
        expected = (
            "data-assets",
            "quality-rule-sql-merge-optimization",
            scenario.case_id,
        )
        if actual != expected:
            message = f"runtime identity {actual!r} does not match explicit scenario {expected!r}"
            raise AssertionError(message)

    def require_fixture_identity(self, scenario: ReadOnlyScenario) -> None:
        """Fail closed until a canonical existing result fixture is attested."""
        del scenario
        raise SqlMergeUiError(READ_ONLY_FIXTURE_IDENTITY_CODE)

    def require_report_fixture_identity(self, scenario: ReadOnlyScenario) -> None:
        """Fail closed until a canonical existing report fixture is attested."""
        self.require_fixture_identity(scenario)

    def verify_shared_dirty_sql(self, scenario: ReadOnlyScenario) -> str:
        """Read the task SQL and require all inserts to share one dirty table."""
        sql = self.screen.rule_tasks.open_rule_sql(
            table_name=scenario.table_name,
            rule_names=scenario.rule_names,
        )
        return assert_shared_dirty_table(sql)

    def open_unpassed_result(self, scenario: ReadOnlyScenario) -> Locator:
        """Open the exact table's existing unpassed result."""
        self.require_fixture_identity(scenario)
        return self.screen.results.open_unpassed_result(
            table_name=scenario.table_name,
            rule_names=scenario.rule_names,
        )

    def download_dirty_rows(
        self,
        *,
        drawer: Locator,
        rule_name: str,
        compare_with_ui: bool,
    ) -> TableSnapshot:
        """Verify the 100-row cap and optionally exact downloaded content."""
        visible = self.screen.results.open_dirty_detail(drawer=drawer, rule_name=rule_name)
        path = self.screen.results.download_open_detail()
        downloaded = read_xlsx_snapshot(path, maximum_rows=100)
        if compare_with_ui:
            assert_download_matches_visible_rows(downloaded, visible)
        return downloaded


@dataclass(frozen=True, slots=True)
class SqlMergeWriteActions:
    """Compose write checkpoints while every case retains an explicit scenario."""

    screen: SqlMergeOptimizationScreen
    identity: AutomationRuntimeIdentity

    def verify_identity(self, scenario: WriteScenario) -> None:
        """Bind a write scenario to the immutable manifest item before mutation."""
        key = self.identity.case
        actual = (key.project_id, key.feature_id, key.case_id)
        expected = (
            "data-assets",
            "quality-rule-sql-merge-optimization",
            scenario.case_id,
        )
        if actual != expected:
            message = f"runtime identity {actual!r} does not match explicit scenario {expected!r}"
            raise AssertionError(message)

    def require_multi_stage_revision(self, scenario: WriteScenario) -> None:
        """Fail closed until same-task multi-stage UI mutation is source-backed."""
        if scenario.revisions:
            raise SqlMergeUiError(MULTI_STAGE_REVISION_CODE)

    def provision(self, scenario: WriteScenario) -> ProvisionedWriteScenario:
        """Create one collision-safe rule set/task through the typed product UI."""
        provisioner = SqlMergeProvisioner(
            rule_sets=self.screen.rule_sets,
            tasks=self.screen.task_provisioning,
        )
        return provisioner.create(scenario, identity=self.identity)

    def inspect_sql_topology(
        self,
        scenario: ProvisionedWriteScenario,
    ) -> SqlTopologyReadback:
        """Read generated SQL and bind topology membership to persisted rule IDs."""
        sql = self.screen.rule_tasks.inspect_write_task_sql(scenario)
        return assert_sql_topology(
            sql,
            table_name=scenario.source.table_name,
            rule_count=scenario.source.rule_count,
            expectation=scenario.source.topology,
            rule_identities=scenario.sql_rule_identities,
        )

    def execute_and_open_fresh_result(
        self,
        scenario: ProvisionedWriteScenario,
    ) -> tuple[Locator, str, str]:
        """Execute through UI and reject an already-existing donor result."""
        baseline = self.screen.results.result_baseline(scenario)
        self.screen.rule_tasks.execute_write_task(
            table_name=scenario.source.table_name,
            task_name=scenario.task_name,
            monitor_id=scenario.monitor_id,
        )
        return self.screen.results.open_fresh_result(
            scenario,
            baseline=baseline,
        )

    def verify_result(
        self,
        *,
        drawer: Locator,
        scenario: ProvisionedWriteScenario,
        instance_id: str,
        finished_at: str,
    ) -> TaskExecutionReadback:
        """Verify all rule cards and return the UI business record readback."""
        return self.screen.results.expect_write_result(
            drawer=drawer,
            scenario=scenario,
            instance_id=instance_id,
            finished_at=finished_at,
        )
