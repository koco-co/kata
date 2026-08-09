"""C0002: read-only Data Standard statistics and reference-data journey."""

# ruff: noqa: INP001

from __future__ import annotations

from typing import TYPE_CHECKING

from data_assets_playwright_web_ui.components.navigation import DataAssetsNavigation
from data_assets_playwright_web_ui.domains.data_standard.standard_statistics import (
    StandardReferenceData,
    StandardStatisticsScreen,
    StandardStatisticsSnapshot,
)
from playwright_web_ui import automation_case

if TYPE_CHECKING:
    from playwright.sync_api import Page

    from playwright_web_ui.platform_context import PlatformContext
    from playwright_web_ui.pytest_plugin import StepFixture

_REFERENCE_DATA = StandardReferenceData(
    root_abbreviation="email",
    root_full_name="email",
    root_chinese_name="邮箱",
    code_name="code",
    code_number="001",
    code_catalog="CatalogA",
    standard_chinese_name="金额",
    standard_english_name="money",
    standard_number="StandardCodeA",
)


@automation_case(
    project_id="data-assets",
    feature_id="data-assets-core-module-integration-suite",
    case_id="C0002",
)
def test_data_standard_statistics_and_reference_records(
    page: Page,
    platform_context: PlatformContext,
    step: StepFixture,
) -> None:
    """Verify the canonical C0002 read-only UI checkpoints."""
    screen = StandardStatisticsScreen(DataAssetsNavigation(page, platform_context))
    statistics: StandardStatisticsSnapshot | None = None

    with step(
        action="进入【数据标准 → 标准统计】页面", expected="标准统计页面加载成功", target="标准统计"
    ):
        statistics = screen.open_statistics()
    if statistics is None:
        message = "标准统计页面未返回四图业务数据"
        raise AssertionError(message)
    with step(
        action="查看标准统计卡片",
        expected="数据标准、代码表和词根管理数量均大于或等于 1",
        target="统计卡片",
    ):
        screen.expect_non_empty_summary_cards()
    with step(
        action="查看标准热度、目录分布、趋势和来源分布",
        expected="四图分别展示名称与次数、目录与数量、时间轴与数据点、来源与数量",
        target="标准统计图表",
    ):
        screen.expect_populated_distribution_charts(statistics)
    with step(
        action="在词根管理搜索 email",
        expected="结果展示 email、email、邮箱",
        target="词根管理列表",
    ):
        screen.expect_root_record(_REFERENCE_DATA)
    with step(
        action="在 CatalogA 代码目录搜索 001",
        expected="结果展示 code、001。详情明确归属 CatalogA",
        target="码表管理列表",
    ):
        screen.expect_code_record(_REFERENCE_DATA)
    with step(
        action="在标准定义搜索 StandardCodeA 并查看详情",
        expected="结果展示金额、money 和 StandardCodeA",
        target="标准定义列表与详情",
    ):
        screen.expect_standard_record(_REFERENCE_DATA)
