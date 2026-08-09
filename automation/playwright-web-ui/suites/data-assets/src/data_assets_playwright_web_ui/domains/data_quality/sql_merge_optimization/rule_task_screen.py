"""Persisted rule-task Drawer, SQL, and execution capabilities."""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from typing import TYPE_CHECKING, cast
from urllib.parse import urlsplit

from playwright.sync_api import expect

from .api_client import DqApiClient, PackageRecord
from .screen_base import UI_TIMEOUT_MS, SqlMergeScreenBase, SqlMergeUiError

if TYPE_CHECKING:
    from collections.abc import Mapping

    from playwright.sync_api import Locator, Response

    from .write_models import ProvisionedWriteScenario

_MONITOR_DETAIL = "/dassets/v1/valid/monitor/detail"
_PACKAGE_LIST = "/dassets/v1/valid/monitor/packagelist"
_PACKAGE_SQL = "/dassets/v1/valid/monitor/packagesql"
_EXECUTE = "/dassets/v1/valid/monitor/immediatelyExecuted"


@dataclass(frozen=True, slots=True)
class SqlMergeRuleTaskScreen(SqlMergeScreenBase):
    """Read one exact task Drawer and execute its stable monitor identity."""

    @property
    def api(self) -> DqApiClient:
        """Return response decoders bound to the authenticated browser context."""
        return DqApiClient(self.page, self.navigation.platform_context)

    def open_rule_sql(self, *, table_name: str, rule_names: tuple[str, ...]) -> str:
        """Read an existing read-only task only when the table resolves uniquely."""
        self.navigation.open("/dq/rule", landmark="规则任务管理")
        self.search("输入表名搜索", table_name)
        row = self.business_row(table_name)
        expect(row, f"规则任务列表必须展示 {table_name}").to_contain_text(
            self.datasource.name,
            timeout=UI_TIMEOUT_MS,
        )
        row.get_by_text(table_name, exact=True).click()
        drawer = self._single_visible_drawer()
        for rule_name in rule_names:
            expect(
                drawer.get_by_text(rule_name, exact=True),
                f"规则任务详情必须唯一展示子规则“{rule_name}”",
            ).to_have_count(1, timeout=UI_TIMEOUT_MS)
        return self._read_rule_sql(drawer, monitor_id=None, expected_option_count=None)

    def inspect_write_task_sql(self, scenario: ProvisionedWriteScenario) -> str:
        """Read exact task/rules and every generated SQL package from nested Drawers."""
        drawer = self._open_task_drawer(
            table_name=scenario.source.table_name,
            task_name=scenario.task_name,
            monitor_id=scenario.monitor_id,
        )
        self.expect_labeled_value(
            drawer,
            label="规则拼接包",
            value=str(scenario.source.merge_batch_size),
        )
        self._expect_rule_function_counts(drawer, scenario.source.rule_functions)
        expected_count = (
            scenario.source.task.expected_generated_sql_package_count
            if scenario.source.task
            else None
        )
        return self._read_rule_sql(
            drawer,
            monitor_id=scenario.monitor_id,
            expected_option_count=expected_count,
        )

    def execute_write_task(self, *, table_name: str, task_name: str, monitor_id: str) -> None:
        """Submit the exact Drawer-bound monitor ID and require endpoint acknowledgement."""
        drawer = self._open_task_drawer(
            table_name=table_name,
            task_name=task_name,
            monitor_id=monitor_id,
        )
        trigger = drawer.locator(".dtc-drawer-footer").get_by_role(
            "button",
            name="立即执行",
            exact=True,
        )
        with self.page.expect_response(
            lambda response: self._is_post(response, _EXECUTE),
            timeout=UI_TIMEOUT_MS,
        ) as execute_info:
            expect(trigger, "规则任务 Drawer 必须提供立即执行入口").to_be_enabled(
                timeout=UI_TIMEOUT_MS
            )
            trigger.click()
        response = execute_info.value
        self._require_response(response, _EXECUTE)
        if self._body(response) != {"monitorId": int(monitor_id)}:
            message = "立即执行必须只提交当前 Drawer 的 monitorId"
            raise SqlMergeUiError(message)
        self.api.execution_accepted_from_response(response)
        notice = self.page.locator(".ant-message-notice:visible").filter(
            has_text="操作成功，稍后可在任务查询中查看详情"  # noqa: RUF001
        )
        expect(notice, "立即执行必须展示精确成功反馈").to_have_count(
            1,
            timeout=UI_TIMEOUT_MS,
        )

    def task_row(self, *, table_name: str, task_name: str) -> Locator:
        """Return the only exact task/table/datasource list row."""
        rows = (
            self.page.locator(".ant-table-tbody .ant-table-row")
            .filter(has=self.page.get_by_text(table_name, exact=True))
            .filter(has=self.page.get_by_text(task_name, exact=True))
            .filter(has=self.page.get_by_text(self.datasource.name, exact=True))
        )
        expect(rows, f"规则任务列表必须唯一展示 {task_name}/{table_name}").to_have_count(
            1,
            timeout=UI_TIMEOUT_MS,
        )
        return rows.first

    def _open_task_drawer(
        self,
        *,
        table_name: str,
        task_name: str,
        monitor_id: str,
    ) -> Locator:
        self.navigation.open("/dq/rule", landmark="规则任务管理")
        self.search("输入表名搜索", table_name)
        row = self.task_row(table_name=table_name, task_name=task_name)
        with self.page.expect_response(
            lambda response: self._is_post(response, _MONITOR_DETAIL),
            timeout=UI_TIMEOUT_MS,
        ) as detail_info:
            row.get_by_text(table_name, exact=True).click()
        response = detail_info.value
        self._require_response(response, _MONITOR_DETAIL)
        if self._body(response) != {"monitorId": int(monitor_id)}:
            message = "任务详情必须按精确 monitorId 查询"
            raise SqlMergeUiError(message)
        drawer = self.page.locator(".dtc-drawer:visible").filter(
            has=self.page.locator(".dtc-drawer-header").get_by_text(task_name, exact=True)
        )
        expect(drawer, "规则任务必须打开唯一匹配任务名的 Drawer").to_have_count(
            1,
            timeout=UI_TIMEOUT_MS,
        )
        result = drawer.first
        expect(result.get_by_text("规则管理", exact=True)).to_be_visible(timeout=UI_TIMEOUT_MS)
        self.wait_for_spin(result)
        return result

    def _read_rule_sql(
        self,
        drawer: Locator,
        *,
        monitor_id: str | None,
        expected_option_count: int | None,
    ) -> str:
        sql_row = drawer.locator(".ant-descriptions-item").filter(has_text="规则SQL")
        expect(sql_row, "规则任务基本信息必须唯一展示规则SQL入口").to_have_count(
            1,
            timeout=UI_TIMEOUT_MS,
        )
        if monitor_id is None:
            message = "只读规则 SQL 必须由 fixture manifest 提供稳定 monitorId"
            raise SqlMergeUiError(message)
        with (
            self.page.expect_response(
                lambda response: self._is_post(response, _PACKAGE_SQL),
                timeout=UI_TIMEOUT_MS,
            ) as first_sql_info,
            self.page.expect_response(
                lambda response: self._is_post(response, _PACKAGE_LIST),
                timeout=UI_TIMEOUT_MS,
            ) as packages_info,
        ):
            sql_row.get_by_text("查看", exact=True).click()
        package_response = packages_info.value
        self._require_response(package_response, _PACKAGE_LIST)
        if self._body(package_response) != {"monitorId": int(monitor_id)}:
            message = "规则SQL Drawer 必须按当前任务 monitorId 查询包列表"
            raise SqlMergeUiError(message)
        packages = self.api.packages_from_response(package_response)
        if not packages:
            message = "规则SQL Drawer 必须返回至少一个生成包"
            raise SqlMergeUiError(message)
        if expected_option_count is not None and len(packages) != expected_option_count:
            message = "规则SQL包数量必须与 typed task expectation 完全一致"
            raise SqlMergeUiError(message)
        sql_drawer = self.page.locator(".dtc-drawer:visible").filter(
            has=self.page.locator(".dtc-drawer-header").get_by_text("规则SQL", exact=True)
        )
        expect(sql_drawer, "规则SQL必须打开唯一嵌套 Drawer").to_have_count(
            1,
            timeout=UI_TIMEOUT_MS,
        )
        first_response = first_sql_info.value
        self._require_sql_response(first_response, packages[0])
        sql_documents = [self.api.package_sql_from_response(first_response)]
        selector = sql_drawer.locator(".ruleSqlModal-header__select-rulePackage:visible")
        if len(packages) == 1:
            expect(selector, "单 SQL 包时产品不得渲染包下拉").to_have_count(
                0,
                timeout=UI_TIMEOUT_MS,
            )
        else:
            expect(selector, "多 SQL 包时必须渲染唯一包下拉").to_have_count(
                1,
                timeout=UI_TIMEOUT_MS,
            )
            self._assert_package_options(selector, packages)
            for package in packages[1:]:
                with self.page.expect_response(
                    lambda response: self._is_post(response, _PACKAGE_SQL),
                    timeout=UI_TIMEOUT_MS,
                ) as sql_info:
                    selector.locator(".ant-select-selector").click()
                    dropdown = self.page.locator(".ant-select-dropdown:visible").last
                    option = dropdown.get_by_text(package.package_name, exact=True)
                    expect(option, "SQL包下拉必须唯一展示目标包").to_have_count(
                        1,
                        timeout=UI_TIMEOUT_MS,
                    )
                    option.click()
                sql_response = sql_info.value
                self._require_sql_response(sql_response, package)
                sql_documents.append(self.api.package_sql_from_response(sql_response))
        editor = sql_drawer.locator(".monaco-editor .view-lines:visible")
        expect(editor, "SQL Drawer 必须把当前包 SQL 渲染到只读编辑器").not_to_be_empty(
            timeout=UI_TIMEOUT_MS
        )
        sql_drawer.locator(".dtc-drawer-icon").click()
        expect(sql_drawer).to_be_hidden(timeout=UI_TIMEOUT_MS)
        return "\n;\n".join(sql_documents)

    def _assert_package_options(
        self,
        selector: Locator,
        packages: tuple[PackageRecord, ...],
    ) -> None:
        selector.locator(".ant-select-selector").click()
        dropdown = self.page.locator(".ant-select-dropdown:visible").last
        expect(dropdown.locator(".ant-select-item-option")).to_have_count(
            len(packages),
            timeout=UI_TIMEOUT_MS,
        )
        for package in packages:
            expect(dropdown.get_by_text(package.package_name, exact=True)).to_have_count(
                1,
                timeout=UI_TIMEOUT_MS,
            )
        self.page.keyboard.press("Escape")

    def _require_sql_response(self, response: Response, package: PackageRecord) -> None:
        self._require_response(response, _PACKAGE_SQL)
        if self._body(response) != {"packageId": int(package.package_id)}:
            message = "packagesql 必须只查询当前下拉选中的 packageId"
            raise SqlMergeUiError(message)

    def _expect_rule_function_counts(
        self,
        root: Locator,
        functions: tuple[str, ...],
    ) -> None:
        cards = root.locator(".ruleView")
        expect(cards).to_have_count(len(functions), timeout=UI_TIMEOUT_MS)
        for function, count in Counter(functions).items():
            matches = cards.filter(has=self.page.get_by_text(function, exact=True))
            expect(matches, f"任务详情必须准确展示 {count} 条“{function}”子规则").to_have_count(
                count,
                timeout=UI_TIMEOUT_MS,
            )

    def _single_visible_drawer(self) -> Locator:
        drawers = self.page.locator(".dtc-drawer:visible")
        expect(drawers, "当前操作必须只打开一个任务 Drawer").to_have_count(
            1,
            timeout=UI_TIMEOUT_MS,
        )
        return drawers.first

    @staticmethod
    def _is_post(response: Response, path: str) -> bool:
        return response.request.method == "POST" and urlsplit(response.url).path == path

    @classmethod
    def _require_response(cls, response: Response, path: str) -> None:
        if not cls._is_post(response, path) or not response.ok:
            message = "规则任务关键请求必须命中精确 POST 路径并成功"
            raise SqlMergeUiError(message)

    @staticmethod
    def _body(response: Response) -> Mapping[str, object]:
        value = cast("object", response.request.post_data_json)
        if not isinstance(value, dict):
            message = "规则任务关键请求必须提交 JSON object"
            raise SqlMergeUiError(message)
        untyped = cast("dict[object, object]", value)
        if any(not isinstance(key, str) for key in untyped):
            message = "规则任务关键请求必须使用文本字段名"
            raise SqlMergeUiError(message)
        return cast("Mapping[str, object]", untyped)
