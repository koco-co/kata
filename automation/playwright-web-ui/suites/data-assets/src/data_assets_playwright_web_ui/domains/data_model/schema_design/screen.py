"""Read-only Data Model schema-design UI contract."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import TYPE_CHECKING, Final

from playwright.sync_api import expect

if TYPE_CHECKING:
    from playwright.sync_api import Page

    from data_assets_playwright_web_ui.components.navigation import DataAssetsNavigation

_UI_TIMEOUT_MS: Final = 30_000
SPECIFICATION_DESIGN_OPERATIONS: Final = ("新建数仓层级", "编辑", "删除")
MY_MODEL_CANONICAL_HEADERS: Final = ("表名", "表中文名", "创建时间", "操作")


@dataclass(frozen=True, slots=True)
class SchemaDesignScreen:
    """Inspect schema building, design, and approval pages without submitting writes."""

    navigation: DataAssetsNavigation

    @property
    def page(self) -> Page:
        """Return the controlled pytest-playwright page."""
        return self.navigation.page

    def open_table_builder(self) -> None:
        """Open the canonical specification-table list."""
        self.navigation.open("/builtSpecificationTable", landmark="规范建表")

    def expect_navigation_and_table(self) -> None:
        """Assert the model navigation and specification-table columns."""
        for label in ("建表", "规范设计", "授权与审批", "我的模型"):
            expect(
                self.page.get_by_text(label, exact=True).first,
                f"数据模型导航必须展示“{label}”",
            ).to_be_visible(timeout=_UI_TIMEOUT_MS)
        self._expect_headers(
            (
                "表名",
                "表中文名",
                "表来源",
                "表类型",
                "所属数据源",
                "所属数据库",
                "创建时间",
                "操作",
            ),
        )
        expect(
            self.page.get_by_placeholder("请输入表名/表中文名进行搜索", exact=True),
        ).to_be_visible(timeout=_UI_TIMEOUT_MS)

    def open_and_expect_new_table_form(self) -> None:
        """Open but do not submit the new-table form and assert its controls."""
        button = self.page.get_by_role("button", name="新建表", exact=True)
        expect(button).to_be_visible(timeout=_UI_TIMEOUT_MS)
        expect(button).to_be_enabled()
        button.click()
        expect(self.page).to_have_url(
            re.compile(r"#/builtSpecificationTable/editBatch(?:\?|$)"),
            timeout=_UI_TIMEOUT_MS,
        )
        expect(self.page.get_by_text("新建表", exact=True).first).to_be_visible(
            timeout=_UI_TIMEOUT_MS,
        )
        for label in ("写入数据源", "写入数据库", "表名", "表中文名", "生命周期"):
            self._expect_form_label(label)
        for step_name in ("基础信息", "表结构"):
            expect(
                self.page.locator(".ant-steps-item-title").get_by_text(step_name, exact=True),
                f"新建表必须展示“{step_name}”步骤",
            ).to_be_visible(timeout=_UI_TIMEOUT_MS)
        expect(self.page.get_by_role("button", name="下一步", exact=True)).to_be_visible()
        self._select_default_datasource()
        dynamic_label = self.page.locator(".ant-form-item-label").filter(
            has_text=re.compile(r"表类型|数据模型类型|存储格式"),
        )
        expect(dynamic_label.first, "选择数据源后必须展示表类型或数据模型类型").to_be_visible(
            timeout=_UI_TIMEOUT_MS,
        )

    def cancel_and_expect_schema_design(self) -> None:
        """Cancel the form and inspect schema-design and model-element structures."""
        self.page.get_by_role("button", name="取消", exact=True).click()
        expect(self.page).to_have_url(
            re.compile(r"#/builtSpecificationTable(?:\?|$)"),
            timeout=_UI_TIMEOUT_MS,
        )
        self.page.get_by_text("规范设计", exact=True).first.click()
        expect(self.page).to_have_url(
            re.compile(r"#/specificationDesign(?:\?|$)"),
            timeout=_UI_TIMEOUT_MS,
        )
        self._expect_headers(("中文名称", "英文名称", "描述", "创建时间", "操作"))
        new_level = self.page.get_by_role(
            "button",
            name=SPECIFICATION_DESIGN_OPERATIONS[0],
            exact=True,
        )
        expect(
            new_level,
            "规范设计必须展示新增数仓层级入口",
        ).to_be_visible(timeout=_UI_TIMEOUT_MS)
        expect(new_level, "租户管理员必须能够新增数仓层级").to_be_enabled()
        first_row = self.page.locator("tbody .ant-table-row").first
        expect(first_row, "规范设计必须展示可操作的数仓层级记录").to_be_visible(
            timeout=_UI_TIMEOUT_MS,
        )
        for operation in SPECIFICATION_DESIGN_OPERATIONS[1:]:
            button = first_row.get_by_role("button", name=operation, exact=True)
            expect(button, f"规范设计记录必须展示“{operation}”操作").to_be_visible(
                timeout=_UI_TIMEOUT_MS,
            )
            expect(button, f"租户管理员必须能够执行“{operation}”操作").to_be_enabled()

        expect(self.page.get_by_role("button", name="模型元素", exact=True)).to_be_visible(
            timeout=_UI_TIMEOUT_MS,
        )

        self.page.get_by_role("button", name="模型元素", exact=True).click()
        expect(self.page).to_have_url(
            re.compile(r"#/specificationDesign/ModelElement(?:\?|$)"),
            timeout=_UI_TIMEOUT_MS,
        )
        expect(self.page.get_by_text("模型元素", exact=True).first).to_be_visible(
            timeout=_UI_TIMEOUT_MS,
        )
        expect(self.page.get_by_role("button", name="添加元素值", exact=True)).to_be_visible()

    def expect_my_models(self) -> None:
        """Inspect approved and in-progress model tables and withdrawal entry points."""
        self.page.get_by_text("我的模型", exact=True).first.click()
        expect(self.page).to_have_url(re.compile(r"#/myModel(?:\?|$)"), timeout=_UI_TIMEOUT_MS)
        for tab in ("已审批", "审批中"):
            expect(
                self.page.locator(".ant-tabs-tab").get_by_text(tab, exact=True),
                f"我的模型必须展示“{tab}”页签",
            ).to_be_visible(timeout=_UI_TIMEOUT_MS)
        self._expect_headers(MY_MODEL_CANONICAL_HEADERS)

        self.page.locator(".ant-tabs-tab").get_by_text("审批中", exact=True).click()
        self._expect_headers(MY_MODEL_CANONICAL_HEADERS)
        expect(self.page.get_by_text("全选", exact=True).first).to_be_visible(
            timeout=_UI_TIMEOUT_MS,
        )
        expect(self.page.get_by_role("button", name="撤回", exact=True)).to_be_visible()

    def _select_default_datasource(self) -> None:
        source_name = self.navigation.platform_context.datasources[
            self.navigation.platform_context.defaults.datasource
        ].name
        field = self.page.locator(".ant-form-item").filter(has_text="写入数据源").first
        selector = field.locator(".ant-select-selector")
        expect(selector).to_be_visible(timeout=_UI_TIMEOUT_MS)
        selector.click()
        option = (
            self.page.locator(
                ".ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option",
            )
            .filter(has_text=source_name)
            .first
        )
        expect(option, f"默认数据源“{source_name}”必须可选").to_be_visible(timeout=_UI_TIMEOUT_MS)
        option.click()
        expect(field).to_contain_text(source_name)

    def _expect_headers(self, headers: tuple[str, ...]) -> None:
        table_head = self.page.locator("thead")
        expect(table_head.first, "数据模型表头必须可见").to_be_visible(timeout=_UI_TIMEOUT_MS)
        for header in headers:
            expect(
                table_head.get_by_text(header, exact=True).first,
                f"数据模型列表必须展示“{header}”列",
            ).to_be_visible(timeout=_UI_TIMEOUT_MS)

    def _expect_form_label(self, label: str) -> None:
        expect(
            self.page.locator(".ant-form-item-label").get_by_text(label, exact=True).first,
            f"新建表表单必须展示“{label}”字段",
        ).to_be_visible(timeout=_UI_TIMEOUT_MS)
