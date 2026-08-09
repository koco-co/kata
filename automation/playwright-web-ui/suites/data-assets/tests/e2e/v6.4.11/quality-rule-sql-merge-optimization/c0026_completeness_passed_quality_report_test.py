"""C0026 explicit read-only SQL-merge candidate."""
# ruff: noqa: INP001


from __future__ import annotations

from typing import TYPE_CHECKING

from data_assets_playwright_web_ui.components.navigation import DataAssetsNavigation
from data_assets_playwright_web_ui.domains.data_quality.sql_merge_optimization.actions import (
    SqlMergeReadOnlyActions,
)
from data_assets_playwright_web_ui.domains.data_quality.sql_merge_optimization.model import (
    COMPLETENESS_RULES,
    QualityResult,
    ReadOnlyJourney,
    ReadOnlyScenario,
    ReportExpectation,
    RuleFamily,
)
from data_assets_playwright_web_ui.domains.data_quality.sql_merge_optimization.screen import (
    SqlMergeOptimizationScreen,
)
from playwright_web_ui import automation_case

if TYPE_CHECKING:
    from playwright.sync_api import Page

    from playwright_web_ui.platform_context import PlatformContext
    from playwright_web_ui.pytest_plugin import StepFixture
    from playwright_web_ui.runtime_identity import AutomationRuntimeIdentity

_SCENARIO = ReadOnlyScenario(
    case_id="C0026",
    table_name="test_table_15862_c0026",
    journey=ReadOnlyJourney.REPORT,
    rule_family=RuleFamily.COMPLETENESS,
    rule_names=COMPLETENESS_RULES,
    rule_count=4,
    report=ReportExpectation(
        rule_count=4,
        pass_rate=100,
        result=QualityResult.PASSED,
    ),
    compare_download_with_ui=False,
)


@automation_case(
    project_id="data-assets", feature_id="quality-rule-sql-merge-optimization", case_id="C0026"
)
def test_sql_merge_c0026(
    page: Page,
    platform_context: PlatformContext,
    automation_identity: AutomationRuntimeIdentity,
    step: StepFixture,
) -> None:
    actions = SqlMergeReadOnlyActions(
        SqlMergeOptimizationScreen(DataAssetsNavigation(page, platform_context)),
        automation_identity,
    )
    actions.verify_identity(_SCENARIO)
    with step(
        action="核验C0026已有质量报告身份契约",
        expected=(
            "必须由受控 fixture manifest 提供唯一 reportRecordId、task/monitor/table "
            "绑定后才允许打开报告"
        ),
        target="质量报告详情",
    ):
        actions.require_report_fixture_identity(_SCENARIO)
