"""Shared synchronous Playwright primitives for SQL-merge UI capabilities."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import TYPE_CHECKING, Final
from urllib.parse import urlsplit

from playwright.sync_api import expect

if TYPE_CHECKING:
    from playwright.sync_api import Locator, Page, Response

    from data_assets_playwright_web_ui.components.navigation import DataAssetsNavigation
    from playwright_web_ui.platform_context import PlatformDataSource

UI_TIMEOUT_MS: Final = 30_000
RESULT_QUERY_PATH: Final = "/dassets/v1/valid/monitorRecord/pageQuery"
LABELED_VALUE_CONTAINER_XPATH: Final = (
    "xpath=ancestor::*[self::tr or contains("
    "concat(' ', normalize-space(@class), ' '), ' ant-descriptions-item ')][1]"
)


class SqlMergeUiError(AssertionError):
    """Raised when a required SQL-merge business control is absent or ambiguous."""


@dataclass(frozen=True, slots=True)
class SqlMergeScreenBase:
    """Provide exact navigation, datasource, search, and loading synchronization."""

    navigation: DataAssetsNavigation

    @property
    def page(self) -> Page:
        """Return the executor-owned synchronous browser page."""
        return self.navigation.page

    @property
    def datasource(self) -> PlatformDataSource:
        """Resolve the environment-selected datasource without aliases or fallback."""
        context = self.navigation.platform_context
        source = context.datasources.get(context.defaults.datasource)
        if source is None:
            message = "自动化环境默认数据源必须映射到已登记 datasource"
            raise SqlMergeUiError(message)
        return source

    def search(self, placeholder: str, value: str) -> None:
        """Submit one exact list search and wait for the rendered table."""
        search = self.page.get_by_placeholder(placeholder, exact=True)
        expect(search, f"页面必须展示搜索框“{placeholder}”").to_be_visible(timeout=UI_TIMEOUT_MS)
        search.fill(value)
        search.press("Enter")
        self.wait_for_table()

    def search_result(self, value: str) -> Response:
        """Synchronize an exact task-result POST and require a successful response."""
        search = self.page.get_by_placeholder("请输入表名/任务名称搜索", exact=True)
        expect(search, "校验结果查询必须展示精确搜索框").to_be_visible(timeout=UI_TIMEOUT_MS)
        search.fill(value)
        with self.page.expect_response(
            self.is_result_query, timeout=UI_TIMEOUT_MS
        ) as response_info:
            search.press("Enter")
        response = response_info.value
        if not response.ok:
            message = "校验结果 pageQuery 必须返回成功响应"
            raise SqlMergeUiError(message)
        self.wait_for_table()
        return response

    @staticmethod
    def is_result_query(response: Response) -> bool:
        """Return whether one response is the exact result-query POST."""
        return (
            response.request.method == "POST" and urlsplit(response.url).path == RESULT_QUERY_PATH
        )

    def business_row(self, table_name: str) -> Locator:
        """Return one visible business row after an exact table search."""
        rows = self.page.locator(".ant-table-tbody .ant-table-row").filter(
            has=self.page.get_by_text(table_name, exact=True)
        )
        expect(rows, f"业务列表必须唯一定位 {table_name}").to_have_count(
            1,
            timeout=UI_TIMEOUT_MS,
        )
        return rows.first

    def clear_plan_time(self) -> None:
        """Clear the default result time range before an exact case query."""
        range_picker = self.page.locator(".ant-picker-range").first
        expect(range_picker, "校验结果查询必须展示计划时间范围").to_be_visible(
            timeout=UI_TIMEOUT_MS
        )
        clear = range_picker.locator(".ant-picker-clear")
        if clear.count() == 1:
            range_picker.hover()
            clear.click()
            self.wait_for_table()

    def wait_for_table(self) -> None:
        """Wait until the primary AntD table is mounted and no longer spinning."""
        table = self.page.locator(".ant-table").first
        expect(table, "业务列表必须完成挂载").to_be_visible(timeout=UI_TIMEOUT_MS)
        self.wait_for_spin(table)

    @staticmethod
    def wait_for_spin(root: Locator) -> None:
        """Require one scoped loading overlay to become hidden."""
        expect(root.locator(".ant-spin-spinning").first).to_be_hidden(timeout=UI_TIMEOUT_MS)

    @staticmethod
    def expect_labeled_value(root: Locator, *, label: str, value: str) -> None:
        """Bind one exact label and expected value inside its closest container."""
        label_locator = root.get_by_text(label, exact=True).first
        expect(label_locator, f"页面必须展示“{label}”").to_be_visible(timeout=UI_TIMEOUT_MS)
        container = label_locator.locator(LABELED_VALUE_CONTAINER_XPATH)
        target = container if container.count() == 1 else root
        expect(target, f"页面“{label}”必须回显“{value}”").to_contain_text(
            value,
            timeout=UI_TIMEOUT_MS,
        )

    @classmethod
    def expect_one_labeled_value(
        cls,
        root: Locator,
        *,
        label: str,
        values: tuple[str, ...],
    ) -> None:
        """Require one label to render exactly one allowed tenant value."""
        label_locator = root.get_by_text(label, exact=True).first
        expect(label_locator, f"页面必须展示“{label}”").to_be_visible(timeout=UI_TIMEOUT_MS)
        container = label_locator.locator(LABELED_VALUE_CONTAINER_XPATH)
        target = container if container.count() == 1 else root
        pattern = re.compile(rf"^(?:{'|'.join(re.escape(value) for value in values)})$")
        expected = target.get_by_text(pattern).first
        expect(expected, f"页面“{label}”必须展示 canonical 值").to_be_visible(timeout=UI_TIMEOUT_MS)
