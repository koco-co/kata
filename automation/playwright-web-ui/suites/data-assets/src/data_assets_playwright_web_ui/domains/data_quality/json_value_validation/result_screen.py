"""Task-result, quality-report, and dirty-detail UI operations."""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from time import monotonic
from typing import TYPE_CHECKING, Final
from urllib.parse import urlsplit

from playwright.sync_api import expect

from .model import (
    JSON_FORMAT_RULE,
    DatasourceKey,
    JsonValueCase,
    TaskInstanceIdentity,
    TaskResultBaseline,
)

if TYPE_CHECKING:
    from re import Pattern

    from playwright.sync_api import Download, Locator, Page, Response

    from data_assets_playwright_web_ui.components.navigation import DataAssetsNavigation
    from playwright_web_ui.platform_context import PlatformDataSource

_UI_TIMEOUT_MS: Final = 30_000
_RUN_TIMEOUT_MS: Final = 600_000
_TASK_RESULT_PAGE_QUERY_PATH: Final = "/dassets/v1/valid/monitorRecord/pageQuery"
_TASK_DETAIL_REPORT_PATH: Final = "/dassets/v1/valid/monitorRecord/detailReport"
_DATASOURCE_TYPE_LABEL: Final[dict[DatasourceKey, str]] = {
    "sparkthrift": "SparkThrift2.x",
    "doris": "Doris3.x",
    "hive": "Hive2.x",
}


def is_task_result_page_query_request(method: str, url: str) -> bool:
    """Return whether one network request is the exact task-result page query."""
    return method == "POST" and urlsplit(url).path == _TASK_RESULT_PAGE_QUERY_PATH


def is_task_detail_report_request(method: str, url: str) -> bool:
    """Return whether one request is the exact linked task-detail report query."""
    return method == "POST" and urlsplit(url).path == _TASK_DETAIL_REPORT_PATH


class JsonValueResultScreenError(AssertionError):
    """Raised when result or report UI identity cannot be proven safely."""


@dataclass(frozen=True, slots=True)
class _TaskResultRow:
    """One exact task-query row and its stable UI identity."""

    row: Locator
    identity: TaskInstanceIdentity
    status: str


@dataclass(frozen=True, slots=True)
class JsonValueResultScreen:
    """Operate task results, quality reports, and downloaded dirty details."""

    navigation: DataAssetsNavigation

    @property
    def page(self) -> Page:
        """Return the controlled pytest-playwright page."""
        return self.navigation.page

    def datasource(self, key: DatasourceKey) -> PlatformDataSource:
        """Resolve one canonical logical datasource without guessing aliases."""
        source = self.navigation.platform_context.datasources.get(key)
        if source is None:
            message = f"自动化环境必须登记 canonical datasource key“{key}”"
            raise JsonValueResultScreenError(message)
        return source

    def open_latest_result(
        self,
        case: JsonValueCase,
        datasource_key: DatasourceKey,
        *,
        terminal_text: str | Pattern[str],
    ) -> tuple[Locator, TaskInstanceIdentity, str]:
        """Open the newest exact result row after it reaches the expected terminal state."""
        result = self._latest_result_match(
            case,
            datasource_key,
            terminal_text=terminal_text,
        )
        self._open_result_row(result.row)
        drawer = self._result_drawer()
        return drawer, result.identity, result.status

    def capture_result_baseline(
        self,
        case: JsonValueCase,
        datasource_key: DatasourceKey,
    ) -> TaskResultBaseline:
        """Capture exact task/table/source instance IDs before an execution is submitted."""
        self._open_result_query(case)
        matches = self._matching_result_rows(case, datasource_key)
        identities = tuple(match.identity for match in matches)
        if len({identity.instance_id for identity in identities}) != len(identities):
            message = "校验结果查询不得为同一 data-row-key 返回冲突记录"
            raise JsonValueResultScreenError(message)
        return TaskResultBaseline(instances=identities)

    def open_new_result(
        self,
        case: JsonValueCase,
        datasource_key: DatasourceKey,
        *,
        baseline: TaskResultBaseline,
        terminal_text: str | Pattern[str],
    ) -> tuple[Locator, TaskInstanceIdentity, str]:
        """Wait for and open the sole new post-submit result row."""
        result = self._wait_for_new_result(
            case,
            datasource_key,
            baseline=baseline,
            terminal_text=terminal_text,
        )
        self._open_result_row(result.row)
        drawer = self._result_drawer()
        return drawer, result.identity, result.status

    def latest_result_row(
        self,
        case: JsonValueCase,
        datasource_key: DatasourceKey,
        *,
        terminal_text: str | Pattern[str],
    ) -> Locator:
        """Return the newest exact result row after it reaches a terminal state."""
        return self._latest_result_match(
            case,
            datasource_key,
            terminal_text=terminal_text,
        ).row

    def json_rule_card(self, detail: Locator) -> Locator:
        """Locate the JSON-format rule card in an instance report."""
        card = detail.locator(".ruleView").filter(has_text=JSON_FORMAT_RULE).first
        expect(card, "实例监控报告必须展示 JSON 格式校验规则").to_be_visible(
            timeout=_UI_TIMEOUT_MS,
        )
        return card

    def open_dirty_detail(self, rule_card: Locator) -> Locator:
        """Open the dirty-data drawer from one failed rule card."""
        rule_card.get_by_role("button", name="查看明细", exact=True).click()
        drawer = self.page.locator(".ant-drawer:visible").last
        expect(drawer, "规则明细抽屉必须打开").to_be_visible(timeout=_UI_TIMEOUT_MS)
        expect(drawer.get_by_text("明细数据", exact=True)).to_be_visible(timeout=_UI_TIMEOUT_MS)
        return drawer

    def failure_log_tooltip(self, result_row: Locator) -> Locator:
        """Reveal the source-defined connection-failure log tooltip from its status icon."""
        trigger = result_row.locator(".anticon-exclamation-circle").first
        expect(trigger, "运行失败状态必须展示日志提示图标").to_be_visible(
            timeout=_UI_TIMEOUT_MS,
        )
        trigger.hover()
        tooltip = self.page.locator(".ant-tooltip:visible").last
        expect(tooltip, "悬浮失败状态图标必须展示日志内容").to_be_visible(
            timeout=_UI_TIMEOUT_MS,
        )
        return tooltip

    def download_dirty_data(self, drawer: Locator) -> Path:
        """Download dirty rows from the user-visible detail drawer."""
        with self.page.expect_download(timeout=_UI_TIMEOUT_MS) as download_info:
            drawer.get_by_role("button", name="下载明细", exact=True).click()
        return self._download_path(download_info.value)

    def open_quality_report_task_detail(
        self,
        case: JsonValueCase,
        datasource_key: DatasourceKey,
    ) -> Locator:
        """Open the newest report and return the exact linked task instance detail."""
        source = self.datasource(datasource_key)
        self.navigation.open("/dq/qualityReport", landmark="数据质量报告")
        self._wait_for_table()
        search = self.page.get_by_placeholder("请输入表名搜索", exact=True)
        expect(search).to_be_visible(timeout=_UI_TIMEOUT_MS)
        search.fill(case.table_name)
        search.press("Enter")
        self._wait_for_table()
        report_table = self.page.locator(".ant-table").first
        table_index = self._table_column_index(report_table, "表名")
        source_index = self._table_column_index(report_table, "所属数据源")
        update_index = self._table_column_index(report_table, "更新时间")
        expected_source = f"{source.name}({_DATASOURCE_TYPE_LABEL[datasource_key]})"
        candidates: list[tuple[str, str, Locator]] = []
        rows = report_table.locator("tbody .ant-table-row")
        for offset in range(rows.count()):
            row = rows.nth(offset)
            if not (
                self._matches_table_cell(self._cell_text(row, table_index), case.table_name)
                and self._cell_text(row, source_index) == expected_source
            ):
                continue
            report_id = (row.get_attribute("data-row-key") or "").strip()
            report_time = self._cell_text(row, update_index)
            if not report_id or not report_time or report_time == "--":
                message = "质量报告必须同时提供 data-row-key 与更新时间"
                raise JsonValueResultScreenError(message)
            candidates.append((report_time, report_id, row))
        if not candidates:
            message = f"质量报告必须展示 {source.name}/{case.table_name} 的精确报告"
            raise JsonValueResultScreenError(message)
        _report_time, _report_id, report = max(candidates, key=lambda item: item[:2])
        report.get_by_role("button", name="查看报告", exact=True).click()
        expect(self.page).to_have_url(
            re.compile(r"#/dq/qualityReportDetail(?:\?.*)?$"),
            timeout=_UI_TIMEOUT_MS,
        )
        recent_table = self._unique_report_section_table("近期规则校验异常明细")
        task_row = self._latest_report_task_row(recent_table, case.task_name)
        with self.page.expect_response(
            self._is_task_detail_report_response,
            timeout=_UI_TIMEOUT_MS,
        ) as response_info:
            task_row.get_by_role("button", name="查看详情", exact=True).click()
        expect(self.page).to_have_url(
            re.compile(r"#/dq/taskQuery(?:\?.*)?$"),
            timeout=_UI_TIMEOUT_MS,
        )
        response = response_info.value
        self._require_ok_task_detail_report_response(response)
        response.finished()
        detail = self._result_drawer()
        expect(detail.locator(".ant-spin-spinning")).to_have_count(
            0,
            timeout=_UI_TIMEOUT_MS,
        )
        return detail

    def _unique_report_section_table(self, title: str) -> Locator:
        heading = self.page.get_by_text(title, exact=True)
        if heading.count() != 1:
            message = f"质量报告详情必须唯一展示“{title}”区块标题"
            raise JsonValueResultScreenError(message)
        section = heading.locator(
            "xpath=ancestor::div["
            "contains(concat(' ', normalize-space(@class), ' '), "
            "' tableValidStatistics ')][1]",
        )
        if section.count() != 1:
            message = f"质量报告详情“{title}”必须属于唯一统计区块"
            raise JsonValueResultScreenError(message)
        table = section.locator(".ant-table")
        if table.count() != 1:
            message = f"质量报告详情“{title}”区块必须包含唯一数据表"
            raise JsonValueResultScreenError(message)
        expect(table).to_be_visible(timeout=_UI_TIMEOUT_MS)
        return table

    def _latest_report_task_row(self, table: Locator, task_name: str) -> Locator:
        task_index = self._table_column_index(table, "规则名称")
        time_index = self._table_column_index(table, "规则检验结束时间")
        candidates: list[tuple[str, str, Locator]] = []
        rows = table.locator("tbody .ant-table-row")
        for offset in range(rows.count()):
            row = rows.nth(offset)
            if self._cell_text(row, task_index) != task_name:
                continue
            instance_id = (row.get_attribute("data-row-key") or "").strip()
            report_time = self._cell_text(row, time_index)
            if not instance_id or not report_time or report_time == "--":
                message = "质量报告任务行必须提供实例 ID 与规则检验结束时间"
                raise JsonValueResultScreenError(message)
            candidates.append((report_time, instance_id, row))
        if not candidates:
            message = f"质量报告详情必须展示任务 {task_name} 的精确实例行"
            raise JsonValueResultScreenError(message)
        return max(candidates, key=lambda item: item[:2])[2]

    def _latest_result_match(
        self,
        case: JsonValueCase,
        datasource_key: DatasourceKey,
        *,
        terminal_text: str | Pattern[str],
    ) -> _TaskResultRow:
        self._open_result_query(case)
        matches = tuple(
            match
            for match in self._matching_result_rows(case, datasource_key)
            if self._status_matches(match.status, terminal_text)
        )
        if not matches:
            message = (
                f"校验结果必须存在 {self.datasource(datasource_key).name}/"
                f"{case.table_name}/{case.task_name} 的 canonical 终态实例"
            )
            raise JsonValueResultScreenError(message)
        return max(
            matches,
            key=lambda match: (match.identity.execute_time, match.identity.instance_id),
        )

    def _wait_for_new_result(
        self,
        case: JsonValueCase,
        datasource_key: DatasourceKey,
        *,
        baseline: TaskResultBaseline,
        terminal_text: str | Pattern[str],
    ) -> _TaskResultRow:
        self._open_result_query(case)
        deadline = monotonic() + (_RUN_TIMEOUT_MS / 1_000)
        while monotonic() < deadline:
            new_matches = tuple(
                match
                for match in self._matching_result_rows(case, datasource_key)
                if match.identity.instance_id not in baseline.instance_ids
            )
            new_ids = {match.identity.instance_id for match in new_matches}
            if len(new_ids) > 1:
                message = f"本次提交后出现多个新实例, 无法安全归因: {sorted(new_ids)}"
                raise JsonValueResultScreenError(message)
            if len(new_matches) == 1:
                result = new_matches[0]
                if self._status_matches(result.status, terminal_text):
                    return result
                if result.status not in {"等待运行", "运行中", "停止中"}:
                    message = (
                        f"新实例 {result.identity.instance_id} 进入非预期终态“{result.status}”"
                    )
                    raise JsonValueResultScreenError(message)
            refresh = self.page.locator(".anticon-reload").first
            expect(refresh, "校验结果查询必须展示刷新数据控件").to_be_visible(
                timeout=_UI_TIMEOUT_MS,
            )
            with self.page.expect_response(
                self._is_task_result_page_response,
                timeout=_UI_TIMEOUT_MS,
            ) as response_info:
                refresh.click()
            self._require_ok_task_result_response(response_info.value)
            self._wait_for_table()
        message = "等待本次提交生成唯一的新终态实例超时"
        raise JsonValueResultScreenError(message)

    def _open_result_query(self, case: JsonValueCase) -> None:
        self.navigation.open("/dq/taskQuery", landmark="校验结果查询")
        self._wait_for_table()
        search = self.page.get_by_placeholder("请输入表名/任务名称搜索", exact=True)
        expect(search).to_be_visible(timeout=_UI_TIMEOUT_MS)
        search.fill(case.table_name)
        with self.page.expect_response(
            self._is_task_result_page_response,
            timeout=_UI_TIMEOUT_MS,
        ) as response_info:
            search.press("Enter")
        self._require_ok_task_result_response(response_info.value)
        self._wait_for_table()

    def _matching_result_rows(
        self,
        case: JsonValueCase,
        datasource_key: DatasourceKey,
    ) -> tuple[_TaskResultRow, ...]:
        source = self.datasource(datasource_key)
        table = self.page.locator(".ant-table").first
        indexes = {
            header: self._table_column_index(table, header)
            for header in ("表", "任务名称", "状态", "数据源", "开始时间")
        }
        expected_source = f"{_DATASOURCE_TYPE_LABEL[datasource_key]} / {source.name}"
        matches: list[_TaskResultRow] = []
        seen: dict[str, TaskInstanceIdentity] = {}
        rows = table.locator("tbody .ant-table-row")
        for offset in range(rows.count()):
            row = rows.nth(offset)
            if not self._is_expected_result_row(row, indexes, case, expected_source):
                continue
            instance_id = (row.get_attribute("data-row-key") or "").strip()
            identity = TaskInstanceIdentity(
                instance_id,
                self._cell_text(row, indexes["开始时间"]),
            )
            previous = seen.get(instance_id)
            if previous is not None:
                if previous != identity:
                    message = f"data-row-key {instance_id} 对应多个执行时间"
                    raise JsonValueResultScreenError(message)
                continue
            seen[instance_id] = identity
            matches.append(
                _TaskResultRow(
                    row=row,
                    identity=identity,
                    status=self._cell_text(row, indexes["状态"]),
                ),
            )
        return tuple(matches)

    def _is_expected_result_row(
        self,
        row: Locator,
        indexes: dict[str, int],
        case: JsonValueCase,
        expected_source: str,
    ) -> bool:
        table_text = self._cell_text(row, indexes["表"])
        return (
            self._matches_table_cell(table_text, case.table_name)
            and self._cell_text(row, indexes["任务名称"]) == case.task_name
            and self._cell_text(row, indexes["数据源"]) == expected_source
        )

    def _result_drawer(self) -> Locator:
        drawer = self.page.locator(".ant-drawer:visible")
        expect(drawer, "校验实例监控报告抽屉必须打开").to_be_visible(
            timeout=_UI_TIMEOUT_MS,
        )
        expect(drawer.get_by_text("监控报告", exact=True)).to_be_visible(
            timeout=_UI_TIMEOUT_MS,
        )
        return drawer

    @staticmethod
    def _is_task_result_page_response(response: Response) -> bool:
        return is_task_result_page_query_request(response.request.method, response.url)

    @staticmethod
    def _is_task_detail_report_response(response: Response) -> bool:
        return is_task_detail_report_request(response.request.method, response.url)

    @staticmethod
    def _require_ok_task_result_response(response: Response) -> None:
        if not response.ok:
            message = (
                f"校验结果查询 pageQuery 请求失败: HTTP {response.status} {response.status_text}"
            )
            raise JsonValueResultScreenError(message)

    @staticmethod
    def _require_ok_task_detail_report_response(response: Response) -> None:
        if not response.ok:
            message = f"目标任务实例详情请求失败: HTTP {response.status} {response.status_text}"
            raise JsonValueResultScreenError(message)

    @staticmethod
    def _status_matches(status: str, expected: str | Pattern[str]) -> bool:
        if isinstance(expected, str):
            if expected == "已完成":
                return status in {"已完成", "校验通过", "校验未通过"}
            return status == expected
        return expected.fullmatch(status) is not None

    @staticmethod
    def _matches_table_cell(actual: str, expected: str) -> bool:
        return actual == expected or bool(
            re.fullmatch(rf"{re.escape(expected)}\s+\(.+\)", actual),
        )

    @staticmethod
    def _table_column_index(table: Locator, header: str) -> int:
        locator = table.locator("thead th").filter(
            has_text=re.compile(rf"^\s*{re.escape(header)}\s*$"),
        )
        if locator.count() != 1:
            message = f"数据表必须唯一展示“{header}”列"
            raise JsonValueResultScreenError(message)
        index = locator.evaluate("element => element.cellIndex")
        if not isinstance(index, int):
            message = f"无法读取数据表“{header}”列位置"
            raise JsonValueResultScreenError(message)
        return index

    @staticmethod
    def _cell_text(row: Locator, index: int) -> str:
        return " ".join(row.locator("td").nth(index).inner_text().split())

    @staticmethod
    def _open_result_row(row: Locator) -> None:
        button = row.locator("td").first.get_by_role("button")
        expect(button, "精确实例行的表列必须提供监控报告入口").to_be_visible(
            timeout=_UI_TIMEOUT_MS,
        )
        button.click()

    def _wait_for_table(self) -> None:
        expect(self.page.locator(".ant-spin-spinning")).to_have_count(
            0,
            timeout=_UI_TIMEOUT_MS,
        )
        expect(self.page.locator(".ant-table").first).to_be_visible(timeout=_UI_TIMEOUT_MS)

    @staticmethod
    def _download_path(download: Download) -> Path:
        suggested = download.suggested_filename
        if not suggested.lower().endswith(".xlsx"):
            message = f"下载文件必须为 xlsx。实际为“{suggested}”"
            raise JsonValueResultScreenError(message)
        return Path(download.path())
