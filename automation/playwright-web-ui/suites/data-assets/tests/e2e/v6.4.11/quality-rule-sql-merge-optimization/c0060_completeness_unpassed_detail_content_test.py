"""C0060 explicit read-only SQL-merge candidate."""
# ruff: noqa: INP001, RUF001

from __future__ import annotations

from typing import TYPE_CHECKING

from data_assets_playwright_web_ui.components.navigation import DataAssetsNavigation
from data_assets_playwright_web_ui.domains.data_quality.sql_merge_optimization.actions import (
    SqlMergeReadOnlyActions,
)
from data_assets_playwright_web_ui.domains.data_quality.sql_merge_optimization.model import (
    COMPLETENESS_RULES,
    ReadOnlyJourney,
    ReadOnlyScenario,
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
    case_id="C0060",
    table_name="test_table_15862_c0060",
    journey=ReadOnlyJourney.DETAIL_DOWNLOAD,
    rule_family=RuleFamily.COMPLETENESS,
    rule_names=COMPLETENESS_RULES,
    rule_count=5,
    compare_download_with_ui=True,
)


@automation_case(
    project_id="data-assets", feature_id="quality-rule-sql-merge-optimization", case_id="C0060"
)
def test_sql_merge_c0060(
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
    actions.require_fixture_identity(_SCENARIO)
    with step(
        action="打开C0060既有未通过实例详情",
        expected="仅接受受控 fixture manifest 指定的唯一 monitorId/recordId，不按首行猜测",
        target=_SCENARIO.table_name,
    ):
        drawer = actions.open_unpassed_result(_SCENARIO)
    with step(
        action="下载C0060脏数据明细并校验边界",
        expected="下载文件不超过100行，必要时与页面可见行逐项一致",
        target="实例明细",
    ):
        actions.download_dirty_rows(
            drawer=drawer,
            rule_name=_SCENARIO.rule_names[0],
            compare_with_ui=_SCENARIO.compare_download_with_ui,
        )
