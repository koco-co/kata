"""Strict synchronous Playwright primitives for Data Quality JSON validation."""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING, Final

from playwright.sync_api import expect

from data_assets_playwright_web_ui.domains.data_quality.json_value_validation.model import (
    JSON_FORMAT_RULE,
    DatasourceKey,
    JsonValueCase,
)
from data_assets_playwright_web_ui.domains.data_quality.json_value_validation.result_screen import (
    JsonValueResultScreen,
)

if TYPE_CHECKING:
    from playwright.sync_api import Download, Locator, Page

    from data_assets_playwright_web_ui.components.navigation import DataAssetsNavigation
    from playwright_web_ui.platform_context import PlatformDataSource

_UI_TIMEOUT_MS: Final = 30_000
_DATASOURCE_TYPE_LABEL: Final[dict[DatasourceKey, str]] = {
    "sparkthrift": "SparkThrift2.x",
    "doris": "Doris3.x",
    "hive": "Hive2.x",
}


class JsonValueValidationScreenError(AssertionError):
    """Raised when a required platform control or environment mapping is absent."""


@dataclass(frozen=True, slots=True)
class JsonValueValidationScreen:
    """Expose stable UI operations used by the JSON validation business journeys."""

    navigation: DataAssetsNavigation

    @property
    def page(self) -> Page:
        """Return the controlled pytest-playwright page."""
        return self.navigation.page

    @property
    def results(self) -> JsonValueResultScreen:
        """Return task-result and quality-report operations for this navigation."""
        return JsonValueResultScreen(self.navigation)

    def datasource(self, key: DatasourceKey) -> PlatformDataSource:
        """Resolve one canonical logical datasource without guessing aliases."""
        source = self.navigation.platform_context.datasources.get(key)
        if source is None:
            message = f"自动化环境必须登记 canonical datasource key“{key}”"
            raise JsonValueValidationScreenError(message)
        return source

    def open_rule_set_editor(
        self,
        case: JsonValueCase,
        datasource_key: DatasourceKey,
    ) -> Locator:
        """Open an existing rule set by table and datasource, then enter Step 2."""
        source = self.datasource(datasource_key)
        self.navigation.open("/dq/ruleSet", landmark="规则集管理")
        self._wait_for_table()
        search = self.page.get_by_placeholder("输入表名搜索", exact=True)
        expect(search).to_be_visible(timeout=_UI_TIMEOUT_MS)
        search.fill(case.table_name)
        search.press("Enter")
        self._wait_for_table()
        row = (
            self.page.locator("tbody .ant-table-row")
            .filter(
                has=self.page.get_by_text(case.table_name, exact=True),
            )
            .filter(has_text=source.name)
            .first
        )
        expect(
            row,
            f"规则集列表必须展示 {source.name}/{case.table_name}",
        ).to_be_visible(timeout=_UI_TIMEOUT_MS)
        row.get_by_role("button", name="编辑", exact=True).click()
        expect(self.page).to_have_url(
            re.compile(r"#/dq/ruleSet/edit/[0-9]+(?:\?.*)?$"),
            timeout=_UI_TIMEOUT_MS,
        )
        self._compact_button("下一步").click()
        expect(self.page.get_by_text("监控规则", exact=True).first).to_be_visible(
            timeout=_UI_TIMEOUT_MS,
        )
        package = self.rule_package(case.package_name)
        expect(package).to_be_visible(timeout=_UI_TIMEOUT_MS)
        return package

    def create_rule_set_draft(
        self,
        case: JsonValueCase,
        datasource_key: DatasourceKey,
        *,
        package_name: str,
    ) -> Locator:
        """Create Step 1 through the UI and return the new Step 2 package."""
        source = self.datasource(datasource_key)
        self.navigation.open("/dq/ruleSet", landmark="规则集管理")
        self.page.get_by_role("button", name="新建规则集", exact=True).click()
        expect(self.page).to_have_url(
            re.compile(r"#/dq/ruleSet/add(?:\?.*)?$"),
            timeout=_UI_TIMEOUT_MS,
        )
        self.select_form_option("选择数据源", source.name)
        self.select_form_option("选择数据库", source.database)
        self.select_form_option("选择数据表", case.table_name)
        package_input = self.page.get_by_placeholder("请输入规则包名称", exact=True).first
        expect(package_input).to_be_visible(timeout=_UI_TIMEOUT_MS)
        package_input.fill(package_name)
        expect(package_input).to_have_value(package_name)
        self._compact_button("下一步").click()
        expect(self.page.get_by_text("监控规则", exact=True).first).to_be_visible(
            timeout=_UI_TIMEOUT_MS,
        )
        package = self.rule_package(package_name)
        expect(package).to_be_visible(timeout=_UI_TIMEOUT_MS)
        return package

    def rule_package(self, package_name: str) -> Locator:
        """Locate one rule package by its selected exact package name."""
        packages = self.page.locator(".ruleSetMonitor__package").filter(
            has=self.page.locator(".ruleSetMonitor__packageSelect").get_by_text(
                package_name,
                exact=True,
            ),
        )
        expect(packages.first, f"规则集必须展示规则包“{package_name}”").to_be_visible(
            timeout=_UI_TIMEOUT_MS,
        )
        if packages.count() != 1:
            message = f"规则集编辑器必须唯一展示规则包“{package_name}”"
            raise JsonValueValidationScreenError(message)
        return packages.first

    def existing_json_rule(self, package: Locator) -> Locator:
        """Return the persisted JSON-format rule form from a package."""
        forms = package.locator(".ruleForm").filter(has_text=JSON_FORMAT_RULE)
        expect(forms.first, "规则包必须包含已保存的 JSON 格式校验规则").to_be_visible(
            timeout=_UI_TIMEOUT_MS,
        )
        if forms.count() != 1:
            message = "对应既有规则包必须唯一包含一条已保存的 JSON 格式校验规则"
            raise JsonValueValidationScreenError(message)
        return forms.first

    def add_validity_rule(self, package: Locator) -> Locator:
        """Add one unsaved validity rule through the package dropdown."""
        before = package.locator(".ruleForm").count()
        package.get_by_role("button", name=re.compile(r"^添\s*加\s*规\s*则$")).click()
        menu = self.page.locator(".ant-dropdown:visible .ant-dropdown-menu")
        expect(menu, "添加规则菜单必须打开").to_be_visible(timeout=_UI_TIMEOUT_MS)
        menu.get_by_text("有效性校验", exact=True).click()
        form = package.locator(".ruleForm").nth(before)
        expect(form, "规则包必须新增有效性校验表单").to_be_visible(timeout=_UI_TIMEOUT_MS)
        return form

    def select_field(self, rule_form: Locator, field_name: str) -> None:
        """Select a field from the exact field form item."""
        item = (
            rule_form.locator(".ant-form-item")
            .filter(
                has=rule_form.get_by_text("字段", exact=True),
            )
            .first
        )
        self._select_option(item.locator(".ant-select").first, field_name)

    def open_function_options(self, rule_form: Locator) -> Locator:
        """Open the statistics-function dropdown for the first function row."""
        row = rule_form.locator(".rule__function-list__item").first
        selector = row.locator(".ant-select").first
        expect(selector, "统计规则选择器必须可见").to_be_visible(timeout=_UI_TIMEOUT_MS)
        selector.click()
        dropdown = self.page.locator(
            ".ant-select-dropdown:not(.ant-select-dropdown-hidden):visible",
        ).last
        expect(dropdown, "统计规则下拉必须打开").to_be_visible(timeout=_UI_TIMEOUT_MS)
        return dropdown

    def select_json_function(self, rule_form: Locator) -> None:
        """Select the exact JSON format-validation function."""
        dropdown = self.open_function_options(rule_form)
        dropdown.get_by_text(JSON_FORMAT_RULE, exact=True).click()
        expect(rule_form.locator(".rule__function-list__item").first).to_contain_text(
            JSON_FORMAT_RULE,
        )

    def function_row(self, rule_form: Locator) -> Locator:
        """Return the JSON function row after it has been selected."""
        row = (
            rule_form.locator(".rule__function-list__item")
            .filter(
                has_text=JSON_FORMAT_RULE,
            )
            .first
        )
        expect(row).to_be_visible(timeout=_UI_TIMEOUT_MS)
        return row

    def key_selector(self, rule_form: Locator) -> Locator:
        """Return the source-confirmed AntD TreeSelect for validation keys."""
        selector = self.function_row(rule_form).locator(".ant-tree-select").first
        expect(selector, "JSON 规则必须展示校验 key TreeSelect").to_be_visible(
            timeout=_UI_TIMEOUT_MS,
        )
        return selector

    def open_key_dropdown(self, rule_form: Locator) -> Locator:
        """Open the source-confirmed AntD TreeSelect dropdown."""
        selector = self.key_selector(rule_form)
        selector.locator(".ant-select-selector").click()
        dropdown = self.page.locator(".ant-select-tree-dropdown:visible").last
        expect(dropdown, "校验 key 下拉树必须打开").to_be_visible(timeout=_UI_TIMEOUT_MS)
        return dropdown

    def key_node(self, dropdown: Locator, key_name: str) -> Locator:
        """Locate one exact TreeSelect node without matching an ancestor path."""
        title = dropdown.locator(".ant-select-tree-title").get_by_text(key_name, exact=True)
        node = dropdown.locator(".ant-select-tree-treenode").filter(has=title).first
        expect(node, f"校验 key 下拉必须展示“{key_name}”").to_be_visible(
            timeout=_UI_TIMEOUT_MS,
        )
        return node

    def expand_key_tree(self, dropdown: Locator) -> None:
        """Expand every currently collapsed source-confirmed TreeSelect branch."""
        while dropdown.locator(".ant-select-tree-switcher_close").count() > 0:
            dropdown.locator(".ant-select-tree-switcher_close").first.click()

    def select_key(self, dropdown: Locator, key_name: str) -> None:
        """Check one exact validation-key node."""
        node = self.key_node(dropdown, key_name)
        node.locator(".ant-select-tree-checkbox").click()
        expect(node.locator(".ant-select-tree-checkbox")).to_have_class(
            re.compile(r"(?:^|\s)ant-select-tree-checkbox-checked(?:\s|$)"),
        )

    def key_search(self, rule_form: Locator) -> Locator:
        """Return the source-confirmed TreeSelect search input beside its rendered tags."""
        search = self.key_selector(rule_form).locator(
            "input.ant-select-selection-search-input",
        )
        expect(search, "校验 key 下拉必须展示搜索输入框").to_be_visible(
            timeout=_UI_TIMEOUT_MS,
        )
        return search

    def close_dropdown(self) -> None:
        """Close the active dropdown with the native keyboard interaction."""
        self.page.keyboard.press("Escape")

    def set_rule_strength(self, rule_form: Locator, value: str) -> None:
        """Set the strong/weak rule value."""
        item = (
            rule_form.locator(".ant-form-item")
            .filter(
                has=rule_form.get_by_text("强弱规则", exact=True),
            )
            .first
        )
        self._select_option(item.locator(".ant-select").first, value)

    def fill_rule_description(self, rule_form: Locator, value: str) -> None:
        """Fill a collision-safe rule description through the UI."""
        description = rule_form.get_by_placeholder("请输入规则描述", exact=True)
        expect(description).to_be_visible(timeout=_UI_TIMEOUT_MS)
        description.fill(value)
        expect(description).to_have_value(value)

    def save_rule_set(self) -> None:
        """Save the current rule set and require product success feedback."""
        self._compact_button("保存").last.click()
        notice = self.page.locator(".ant-message-notice").filter(has_text="成功").last
        expect(notice, "保存规则集必须展示成功反馈").to_be_visible(timeout=_UI_TIMEOUT_MS)

    def select_form_option(self, label: str, option_text: str) -> None:
        """Select an exact option in a visible AntD form item."""
        item = (
            self.page.locator(".ant-form-item:visible")
            .filter(
                has=self.page.get_by_text(label, exact=True),
            )
            .first
        )
        expect(item, f"表单必须展示“{label}”").to_be_visible(timeout=_UI_TIMEOUT_MS)
        self._select_option(item.locator(".ant-select").first, option_text)

    def create_rule_task(
        self,
        case: JsonValueCase,
        datasource_key: DatasourceKey,
        *,
        task_name: str,
        package_name: str,
    ) -> Locator:
        """Create a manual rule task by referencing the just-saved rule package."""
        source = self.datasource(datasource_key)
        self.navigation.open("/dq/rule/add", landmark="基础信息")
        name_item = (
            self.page.locator(".ant-form-item:visible")
            .filter(
                has=self.page.get_by_text("规则名称", exact=True),
            )
            .first
        )
        name_input = name_item.locator("input").first
        expect(name_input).to_be_visible(timeout=_UI_TIMEOUT_MS)
        name_input.fill(task_name)
        self.select_form_option("选择数据源", source.name)
        self.select_form_option("选择数据库", source.database)
        self.select_form_option("选择数据表", case.table_name)
        self._compact_button("下一步").click()
        self.page.get_by_text("引用规则包", exact=True).click()
        modal = self.page.locator(".ant-modal:visible")
        expect(modal, "引用规则包弹窗必须打开").to_be_visible(timeout=_UI_TIMEOUT_MS)
        package_rows = modal.locator("tbody .ant-table-row").filter(
            has=self.page.get_by_text(package_name, exact=True),
        )
        expect(
            package_rows.first,
            f"引用规则包必须展示既有规则包“{package_name}”",
        ).to_be_visible(timeout=_UI_TIMEOUT_MS)
        if package_rows.count() != 1:
            message = f"引用规则包必须唯一匹配既有规则包“{package_name}”"
            raise JsonValueValidationScreenError(message)
        package_row = package_rows.first
        package_row.locator(".ant-checkbox-input").check()
        modal.get_by_role("button", name="确定", exact=True).click()
        expect(modal).to_be_hidden(timeout=_UI_TIMEOUT_MS)
        expect(self.page.get_by_text(package_name, exact=True).first).to_be_visible(
            timeout=_UI_TIMEOUT_MS,
        )
        self._compact_button("下一步").click()
        expect(self.page.get_by_text("调度属性", exact=True).first).to_be_visible(
            timeout=_UI_TIMEOUT_MS,
        )
        self.select_form_option("调度周期", "手动触发")
        self.select_form_option("资源组", "默认资源组")
        self.select_form_option("超时时间", "不限制")
        self.select_form_option("告警方式", "无")
        no_report = self.page.get_by_text("无需生成报告", exact=True)
        expect(no_report).to_be_visible(timeout=_UI_TIMEOUT_MS)
        no_report.click()
        self._compact_button("保存").click()
        notice = self.page.locator(".ant-message-notice").filter(has_text="成功").last
        expect(notice, "规则任务创建必须展示成功反馈").to_be_visible(timeout=_UI_TIMEOUT_MS)
        return self.open_rule_task_list(case, datasource_key)

    def open_value_preview(self, rule_form: Locator) -> Locator:
        """Open the exact source-defined value-format preview entry."""
        rule_form.get_by_role("button", name="value格式预览", exact=True).click()
        modal = self.page.locator(".ant-modal:visible").filter(has_text="value格式").last
        expect(modal, "value 格式预览弹窗必须打开").to_be_visible(timeout=_UI_TIMEOUT_MS)
        return modal

    def open_json_configuration(self) -> None:
        """Open the source-confirmed JSON validation configuration route."""
        self.navigation.open(
            "/dq/generalConfig/jsonValidationConfig",
            landmark="json格式校验管理",
        )
        expect(self.page.locator(".json-format-check")).to_be_visible(timeout=_UI_TIMEOUT_MS)
        self._wait_for_table()

    def filter_json_configuration(self, datasource_key: DatasourceKey) -> None:
        """Filter configured keys by the exact canonical data-source type."""
        header = (
            self.page.locator(".json-format-check .ant-table th")
            .filter(
                has_text="数据源类型",
            )
            .first
        )
        expect(header, "JSON 配置列表必须展示数据源类型筛选").to_be_visible(
            timeout=_UI_TIMEOUT_MS,
        )
        header.locator(".ant-table-filter-trigger").click()
        dropdown = self.page.locator(
            ".ant-dropdown:visible, .ant-table-filter-dropdown:visible",
        ).last
        expect(dropdown).to_be_visible(timeout=_UI_TIMEOUT_MS)
        dropdown.get_by_text(_DATASOURCE_TYPE_LABEL[datasource_key], exact=True).click()
        confirm = dropdown.get_by_role("button", name=re.compile("确[定认]")).first
        expect(confirm, "数据源类型筛选必须提供确认按钮").to_be_visible(
            timeout=_UI_TIMEOUT_MS,
        )
        confirm.click()
        self._wait_for_table()

    def delete_json_key(self, key_name: str) -> None:
        """Delete one exact configured key and require its removal from the UI list."""
        search = self.page.locator(".dt-search input")
        expect(search).to_be_visible(timeout=_UI_TIMEOUT_MS)
        search.fill(key_name)
        self.page.locator(".dt-search .ant-input-search-button").click()
        self._wait_for_table()
        key_cell = (
            self.page.locator(".json-format-check__key-text")
            .filter(
                has_text=re.compile(rf"^{re.escape(key_name)}$"),
            )
            .first
        )
        row = (
            self.page.locator(".json-format-check tbody .ant-table-row")
            .filter(
                has=key_cell,
            )
            .first
        )
        expect(row).to_be_visible(timeout=_UI_TIMEOUT_MS)
        row.get_by_role("button", name="删除", exact=True).click()
        confirm = self.page.locator(".ant-popover:visible").last
        expect(confirm, "删除 key 必须展示级联影响确认浮层").to_contain_text(
            "若存在子层级key信息会联动删除",
        )
        confirm.get_by_role("button", name="删除", exact=True).click()
        expect(confirm).to_be_hidden(timeout=_UI_TIMEOUT_MS)
        self._wait_for_table()
        expect(row, f"已删除 key“{key_name}”不得继续显示").to_have_count(0)

    def open_rule_task_list(self, case: JsonValueCase, datasource_key: DatasourceKey) -> Locator:
        """Open the rule task list and locate the exact task/table/source row."""
        source = self.datasource(datasource_key)
        self.navigation.open("/dq/rule", landmark="规则任务管理")
        self._wait_for_table()
        search = self.page.get_by_placeholder("输入表名搜索", exact=True)
        expect(search).to_be_visible(timeout=_UI_TIMEOUT_MS)
        search.fill(case.table_name)
        search.press("Enter")
        self._wait_for_table()
        table = self.page.locator(".ant-table").first
        table_index = self._table_column_index(table, "表")
        task_index = self._table_column_index(table, "规则名称")
        source_index = self._table_column_index(table, "数据源")
        expected_source = f"{_DATASOURCE_TYPE_LABEL[datasource_key]} / {source.name}"
        matching_rows: list[Locator] = []
        rows = table.locator("tbody .ant-table-row")
        for offset in range(rows.count()):
            row = rows.nth(offset)
            if (
                self._cell_text(row, table_index) == case.table_name
                and self._cell_text(row, task_index) == case.task_name
                and self._cell_text(row, source_index) == expected_source
            ):
                matching_rows.append(row)
        if len(matching_rows) != 1:
            message = (
                f"规则任务列表必须唯一展示 {source.name}/{case.table_name}/"
                f"{case.task_name}。实际匹配 {len(matching_rows)} 行"
            )
            raise JsonValueValidationScreenError(message)
        return matching_rows[0]

    def execute_task(self, task_row: Locator) -> None:
        """Submit one task execution and require the explicit product acknowledgement."""
        task_row.locator("td").first.get_by_role("link").click()
        detail = self.page.locator(".rule-detail:visible")
        expect(detail, "精确规则任务行必须打开任务详情侧栏").to_be_visible(
            timeout=_UI_TIMEOUT_MS,
        )
        execute = detail.get_by_role("button", name="立即执行", exact=True)
        expect(execute, "规则任务详情必须提供立即执行按钮").to_be_visible(
            timeout=_UI_TIMEOUT_MS,
        )
        execute.click()
        notice = (
            self.page.locator(".ant-message-notice")
            .filter(
                has_text="操作成功\uff0c稍后可在任务查询中查看详情",
            )
            .last
        )
        expect(notice, "立即执行必须提示任务已提交").to_be_visible(timeout=_UI_TIMEOUT_MS)

    def open_rule_base(self) -> Locator:
        """Open and search the built-in rule library for JSON validation."""
        self.navigation.open("/dq/ruleBase", landmark="规则库配置")
        self._wait_for_table()
        search = self.page.locator(".dt-search input")
        expect(search).to_be_visible(timeout=_UI_TIMEOUT_MS)
        search.fill(JSON_FORMAT_RULE)
        search.press("Enter")
        self._wait_for_table()
        row = (
            self.page.locator("tbody .ant-table-row")
            .filter(
                has=self.page.get_by_text(JSON_FORMAT_RULE, exact=True),
            )
            .first
        )
        expect(row).to_be_visible(timeout=_UI_TIMEOUT_MS)
        return row

    def download_rule_library(self) -> Path:
        """Export the built-in rule library and return Playwright's managed path."""
        with self.page.expect_download(timeout=_UI_TIMEOUT_MS) as download_info:
            self.page.get_by_role("button", name="导出规则库", exact=True).click()
            confirm = self.page.locator(".ant-popconfirm:visible")
            expect(confirm).to_contain_text("请确认是否导出规则库")
            confirm.get_by_role("button", name="确定", exact=True).click()
        return self._download_path(download_info.value)

    def _select_option(self, selector: Locator, option_text: str) -> None:
        expect(selector).to_be_visible(timeout=_UI_TIMEOUT_MS)
        selector.click()
        dropdown = self.page.locator(
            ".ant-select-dropdown:not(.ant-select-dropdown-hidden):visible",
        ).last
        expect(dropdown).to_be_visible(timeout=_UI_TIMEOUT_MS)
        option = (
            dropdown.locator(".ant-select-item-option")
            .filter(
                has=self.page.get_by_text(option_text, exact=True),
            )
            .first
        )
        expect(option, f"下拉选项“{option_text}”必须可选").to_be_visible(
            timeout=_UI_TIMEOUT_MS,
        )
        expect(option).not_to_have_attribute("aria-disabled", "true")
        option.click()
        expect(selector).to_contain_text(option_text)

    def _compact_button(self, label: str) -> Locator:
        spaced = r"\s*".join(re.escape(character) for character in label)
        return self.page.get_by_role("button", name=re.compile(rf"^{spaced}$"))

    def _wait_for_table(self) -> None:
        expect(self.page.locator(".ant-spin-spinning")).to_have_count(
            0,
            timeout=_UI_TIMEOUT_MS,
        )
        expect(self.page.locator(".ant-table").first).to_be_visible(timeout=_UI_TIMEOUT_MS)

    @staticmethod
    def _table_column_index(table: Locator, header: str) -> int:
        """Resolve one exact visible AntD header to its DOM cell index."""
        locator = table.locator("thead th").filter(
            has_text=re.compile(rf"^\s*{re.escape(header)}\s*$"),
        )
        if locator.count() != 1:
            message = f"数据表必须唯一展示“{header}”列"
            raise JsonValueValidationScreenError(message)
        index = locator.evaluate("element => element.cellIndex")
        if not isinstance(index, int):
            message = f"无法读取数据表“{header}”列位置"
            raise JsonValueValidationScreenError(message)
        return index

    @staticmethod
    def _cell_text(row: Locator, index: int) -> str:
        """Read one table cell as normalized visible text."""
        return " ".join(row.locator("td").nth(index).inner_text().split())

    @staticmethod
    def _download_path(download: Download) -> Path:
        suggested = download.suggested_filename
        if not suggested.lower().endswith(".xlsx"):
            message = f"下载文件必须为 xlsx。实际为“{suggested}”"
            raise JsonValueValidationScreenError(message)
        return Path(download.path())
