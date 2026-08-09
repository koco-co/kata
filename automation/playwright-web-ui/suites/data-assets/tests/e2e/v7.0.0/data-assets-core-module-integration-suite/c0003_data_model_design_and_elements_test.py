"""C0003: read-only Data Model schema-design journey."""

# ruff: noqa: INP001

from __future__ import annotations

from typing import TYPE_CHECKING

from data_assets_playwright_web_ui.components.navigation import DataAssetsNavigation
from data_assets_playwright_web_ui.domains.data_model.schema_design import SchemaDesignScreen
from playwright_web_ui import automation_case

if TYPE_CHECKING:
    from playwright.sync_api import Page

    from playwright_web_ui.platform_context import PlatformContext
    from playwright_web_ui.pytest_plugin import StepFixture


@automation_case(
    project_id="data-assets",
    feature_id="data-assets-core-module-integration-suite",
    case_id="C0003",
)
def test_data_model_schema_design_and_elements(
    page: Page,
    platform_context: PlatformContext,
    step: StepFixture,
) -> None:
    """Verify the canonical C0003 read-only UI checkpoints."""
    screen = SchemaDesignScreen(DataAssetsNavigation(page, platform_context))

    with step(
        action="进入【数据模型 → 规范建表】页面", expected="规范建表页面加载成功", target="规范建表"
    ):
        screen.open_table_builder()
    with step(
        action="查看规范建表导航和列表",
        expected="四个导航入口和八个核心列表字段完整展示",
        target="规范建表导航与列表",
    ):
        screen.expect_navigation_and_table()
    with step(
        action="点击新建表并查看表单",
        expected="基础信息、表结构、数据源、数据库、表名和类型控件完整展示",
        target="新建表表单",
    ):
        screen.open_and_expect_new_table_form()
    with step(
        action="取消新建表并切换到规范设计和模型元素",
        expected="数仓层级创建时间及新增、编辑、删除操作。模型元素和元素值入口完整展示",
        target="规范设计",
    ):
        screen.cancel_and_expect_schema_design()
    with step(
        action="切换到我的模型并查看审批页签",
        expected="已审批、审批中列表展示创建时间字段和撤回入口",
        target="我的模型",
    ):
        screen.expect_my_models()
