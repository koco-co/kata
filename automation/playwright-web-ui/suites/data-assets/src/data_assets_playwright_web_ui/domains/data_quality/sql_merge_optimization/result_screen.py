"""Fresh execution and dirty-detail UI capabilities for SQL-merge journeys."""

from __future__ import annotations

import re
import time
from dataclasses import dataclass
from typing import TYPE_CHECKING, Final, cast
from urllib.parse import urlsplit

from playwright.sync_api import expect

from .api_client import DqApiClient, ResultRecord
from .result_models import (
    ResultBaseline,
    RuleExecutionReadback,
    RuleExecutionStatus,
    TableSnapshot,
    TaskExecutionReadback,
)
from .screen_base import UI_TIMEOUT_MS, SqlMergeScreenBase, SqlMergeUiError

if TYPE_CHECKING:
    from pathlib import Path

    from playwright.sync_api import Locator, Response

    from .write_models import ProvisionedRuleReadback, ProvisionedWriteScenario

_DOWNLOAD_TIMEOUT_MS: Final = 60_000
_RUN_TIMEOUT_MS: Final = 600_000
_MAX_DETAIL_ROWS: Final = 100
_TIMESTAMP_PATTERN: Final = re.compile(r"\b[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}\b")
_DETAIL_REPORT_PATH: Final = "/dassets/v1/valid/monitorRecord/detailReport"
_POLL_INTERVAL_MS: Final = 2_000


@dataclass(frozen=True, slots=True)
class SqlMergeResultScreen(SqlMergeScreenBase):
    """Capture exact result baselines, fresh instances, and bounded dirty rows."""

    @property
    def api(self) -> DqApiClient:
        """Return the authenticated result identity client."""
        return DqApiClient(self.page, self.navigation.platform_context)

    def result_baseline(self, scenario: ProvisionedWriteScenario) -> ResultBaseline:
        """Capture exact backend record IDs before submitting the current monitor."""
        records = self._exact_api_records(scenario)
        timestamps = tuple(record.finished_at or record.execute_time for record in records)
        return ResultBaseline(
            instance_ids=tuple(record.record_id for record in records),
            latest_time=max(timestamps, default=None),
        )

    def open_fresh_result(
        self,
        scenario: ProvisionedWriteScenario,
        *,
        baseline: ResultBaseline,
    ) -> tuple[Locator, str, str]:
        """Wait for one new terminal backend ID, then open that exact rendered row."""
        record = self._wait_for_new_terminal(scenario, baseline=baseline)
        self.navigation.open("/dq/taskQuery", landmark="校验结果查询")
        self.clear_plan_time()
        response = self.search_result(scenario.task_name)
        rendered_records = self.api.results_from_response(response)
        rendered = tuple(item for item in rendered_records if item.record_id == record.record_id)
        if len(rendered) != 1 or rendered[0] != record:
            message = "结果 pageQuery 必须回传本次精确 record/monitor/task/table/source 记录"
            raise SqlMergeUiError(message)
        row = (
            self.page.locator(f'.ant-table-tbody .ant-table-row[data-row-key="{record.record_id}"]')
            .filter(has=self.page.get_by_text(scenario.source.table_name, exact=True))
            .filter(has=self.page.get_by_text(scenario.task_name, exact=True))
            .filter(has=self.page.get_by_text(self.datasource.name, exact=True))
        )
        expect(row, "结果表必须唯一渲染本次新增 recordId").to_have_count(
            1,
            timeout=UI_TIMEOUT_MS,
        )
        expect(row, "本次校验实例必须达到业务终态").to_contain_text(
            re.compile(r"校验通过|校验未通过|已完成|执行成功|校验完成"),
            timeout=UI_TIMEOUT_MS,
        )
        if self._required_row_key(row) != record.record_id:
            message = "结果行 data-row-key 必须等于 backend recordId"
            raise SqlMergeUiError(message)
        with self.page.expect_response(
            self._is_detail_report,
            timeout=UI_TIMEOUT_MS,
        ) as detail_info:
            row.get_by_text(scenario.source.table_name, exact=True).click()
        detail_response = detail_info.value
        if not detail_response.ok or self._post_body(detail_response) != {
            "recordId": int(record.record_id),
            "monitorId": int(scenario.monitor_id),
        }:
            message = "detailReport 必须按本次 recordId/monitorId 成功查询"
            raise SqlMergeUiError(message)
        details = self.api.detail_report_from_response(detail_response)
        if len(details) != scenario.source.rule_count:
            message = "本次实例 detailReport 必须逐条返回全部 typed 子规则"
            raise SqlMergeUiError(message)
        drawer = self.page.locator(".dtc-drawer:visible").filter(
            has=self.page.locator(".dtc-drawer-header").get_by_text("监控报告", exact=True)
        )
        expect(drawer, "本次实例必须打开唯一监控报告 Drawer").to_have_count(
            1,
            timeout=UI_TIMEOUT_MS,
        )
        expect(drawer, "本次校验实例监控报告必须打开").to_be_visible(timeout=UI_TIMEOUT_MS)
        self.wait_for_spin(drawer)
        if record.finished_at is None:
            message = "成功终态必须包含完成时间"
            raise SqlMergeUiError(message)
        return drawer, record.record_id, record.finished_at

    def expect_write_result(
        self,
        *,
        drawer: Locator,
        scenario: ProvisionedWriteScenario,
        instance_id: str,
        finished_at: str,
    ) -> TaskExecutionReadback:
        """Assert exact YAML result membership or a complete all-rules readback."""
        source = scenario.source
        if source.result.has_explicit_matrix:
            passed_rules = tuple(scenario.rules[index - 1] for index in source.result.passed_rules)
            unpassed_rules = tuple(
                scenario.rules[index - 1] for index in source.result.unpassed_rules
            )
            self._expect_result_group(drawer, passed=True, rules=passed_rules)
            self._expect_result_group(drawer, passed=False, rules=unpassed_rules)
        else:
            passed_rules = self._read_result_group(drawer, passed=True, scenario=scenario)
            unpassed_rules = self._read_result_group(drawer, passed=False, scenario=scenario)
            if len((*passed_rules, *unpassed_rules)) != source.rule_count:
                message = "实例结果必须完整回显全部 canonical 子规则且不得重复"
                raise SqlMergeUiError(message)
        return TaskExecutionReadback(
            instance_id=instance_id,
            table_name=source.table_name,
            task_name=scenario.task_name,
            finished_at=finished_at,
            rule_results=self._structured_rule_results(
                scenario,
                passed=passed_rules,
                unpassed=unpassed_rules,
            ),
        )

    def open_unpassed_result(
        self,
        *,
        table_name: str,
        rule_names: tuple[str, ...],
    ) -> Locator:
        """Open one existing task result and assert every canonical unpassed subrule."""
        self.navigation.open("/dq/taskQuery", landmark="校验结果查询")
        self.clear_plan_time()
        self.search_result(table_name)
        row = self.business_row(table_name)
        expect(row, f"校验结果查询必须展示 {table_name}").to_contain_text(
            self.datasource.name,
            timeout=UI_TIMEOUT_MS,
        )
        row.get_by_text(table_name, exact=True).first.click()
        drawer = self.page.locator(".ant-drawer:visible").last
        expect(drawer, f"{table_name} 校验结果详情必须打开").to_be_visible(timeout=UI_TIMEOUT_MS)
        self.wait_for_spin(drawer)
        unpassed_tab = drawer.get_by_text(re.compile(r"^校验未通过\([1-9][0-9]*\)$")).first
        expect(unpassed_tab, "结果详情必须展示非零校验未通过分组").to_be_visible(
            timeout=UI_TIMEOUT_MS
        )
        unpassed_tab.click()
        for rule_name in rule_names:
            rule = (
                drawer.locator(".ruleView, .ant-table-row")
                .filter(has=self.page.get_by_text(rule_name, exact=True))
                .first
            )
            expect(rule, f"校验未通过分组必须展示“{rule_name}”").to_be_visible(
                timeout=UI_TIMEOUT_MS
            )
        return drawer

    def open_dirty_detail(self, *, drawer: Locator, rule_name: str) -> TableSnapshot:
        """Open one unpassed rule's dirty rows and return the visible bounded snapshot."""
        rule = (
            drawer.locator(".ruleView, .ant-table-row")
            .filter(has=self.page.get_by_text(rule_name, exact=True))
            .first
        )
        expect(rule, f"未达标规则“{rule_name}”必须可见").to_be_visible(timeout=UI_TIMEOUT_MS)
        detail_button = rule.get_by_role("button", name=re.compile(r"^(?:查看明细|查看数据问题)$"))
        expect(detail_button, f"未达标规则“{rule_name}”必须提供查看明细").to_be_enabled(
            timeout=UI_TIMEOUT_MS
        )
        detail_button.click()
        detail = self.page.locator(".ant-drawer:visible").last
        expect(detail.get_by_text(re.compile(r"^查看.+明细$"))).to_be_visible(timeout=UI_TIMEOUT_MS)
        self.wait_for_spin(detail)
        snapshot = self._table_snapshot(detail.locator(".ant-table").last)
        if len(snapshot.rows) > _MAX_DETAIL_ROWS:
            message = f"实例明细最多展示100行, 实际为 {len(snapshot.rows)}"
            raise SqlMergeUiError(message)
        expect(
            detail.get_by_role("button", name="下载明细", exact=True),
            "实例明细必须提供下载入口",
        ).to_be_enabled(timeout=UI_TIMEOUT_MS)
        return snapshot

    def download_open_detail(self) -> Path:
        """Download the currently open dirty-data detail using Playwright's event."""
        detail = self.page.locator(".ant-drawer:visible").last
        button = detail.get_by_role("button", name="下载明细", exact=True)
        expect(button).to_be_enabled(timeout=UI_TIMEOUT_MS)
        with self.page.expect_download(timeout=_DOWNLOAD_TIMEOUT_MS) as download_info:
            button.click()
        path = download_info.value.path()
        if not path.is_file() or path.stat().st_size == 0:
            message = "下载明细必须产生非空本地文件"
            raise SqlMergeUiError(message)
        return path

    def _exact_api_records(
        self,
        scenario: ProvisionedWriteScenario,
    ) -> tuple[ResultRecord, ...]:
        return tuple(
            record
            for record in self.api.query_results(
                monitor_id=scenario.monitor_id,
                table_name=scenario.source.table_name,
                task_name=scenario.task_name,
            )
            if record.monitor_id == scenario.monitor_id
            and record.task_name == scenario.task_name
            and record.table_name == scenario.source.table_name
            and record.datasource_id == self.datasource.assets.id
            and record.datasource_name == self.datasource.name
        )

    def _wait_for_new_terminal(
        self,
        scenario: ProvisionedWriteScenario,
        *,
        baseline: ResultBaseline,
    ) -> ResultRecord:
        deadline = time.monotonic() + (_RUN_TIMEOUT_MS / 1_000)
        while time.monotonic() < deadline:
            fresh = tuple(
                record
                for record in self._exact_api_records(scenario)
                if not baseline.contains(record.record_id)
            )
            if len(fresh) > 1:
                message = "一次立即执行不得生成多个新增 recordId"
                raise SqlMergeUiError(message)
            if fresh:
                record = fresh[0]
                if record.is_terminal and record.finished_at is not None:
                    expected_status = self._expected_terminal_status(scenario)
                    if expected_status is not None and record.status != expected_status:
                        message = "实例 PASS/UNPASS 状态必须与 typed 规则结果矩阵一致"
                        raise SqlMergeUiError(message)
                    if (
                        baseline.latest_time is not None
                        and record.finished_at < baseline.latest_time
                    ):
                        message = "本次实例完成时间不得早于执行前基线"
                        raise SqlMergeUiError(message)
                    return record
            self.page.wait_for_timeout(_POLL_INTERVAL_MS)
        message = "等待本次唯一新增实例达到 PASS(3) 或 UNPASS(4) 终态超时"
        raise SqlMergeUiError(message)

    @staticmethod
    def _expected_terminal_status(scenario: ProvisionedWriteScenario) -> int | None:
        result = scenario.source.result
        if not result.has_explicit_matrix:
            return None
        return 4 if result.unpassed_rules else 3

    @staticmethod
    def _required_row_key(row: Locator) -> str:
        instance_id = row.get_attribute("data-row-key")
        if instance_id is None or not instance_id.strip():
            message = "校验结果行必须提供非空 data-row-key 实例ID"
            raise SqlMergeUiError(message)
        return instance_id.strip()

    def _expect_result_group(
        self,
        drawer: Locator,
        *,
        passed: bool,
        rules: tuple[ProvisionedRuleReadback, ...],
    ) -> None:
        tab = self._result_tab(drawer, passed=passed)
        expected_label = "校验通过" if passed else "校验未通过"
        expect(tab, f"实例详情必须展示{expected_label}({len(rules)})").to_have_text(
            re.compile(rf"^{expected_label}\({len(rules)}\)$"),
            timeout=UI_TIMEOUT_MS,
        )
        tab.click()
        cards = drawer.locator(".ruleView:visible")
        expect(cards).to_have_count(len(rules), timeout=UI_TIMEOUT_MS)
        for rule in rules:
            matches = cards.filter(has=self.page.get_by_text(rule.description, exact=True)).filter(
                has=self.page.get_by_text(rule.expected.function_name, exact=True)
            )
            expect(
                matches, f"{expected_label}分组必须唯一展示规则{rule.expected.index}"
            ).to_have_count(
                1,
                timeout=UI_TIMEOUT_MS,
            )
            expect(matches.get_by_text(rule.expected.function_name, exact=True)).to_be_visible(
                timeout=UI_TIMEOUT_MS
            )
            if not passed:
                for index in range(matches.count()):
                    detail = matches.nth(index).get_by_role(
                        "button",
                        name=re.compile(r"^(?:查看明细|查看数据问题)$"),
                    )
                    expect(detail, "每个未达标子规则必须提供明细入口").to_be_enabled(
                        timeout=UI_TIMEOUT_MS
                    )

    def _read_result_group(
        self,
        drawer: Locator,
        *,
        passed: bool,
        scenario: ProvisionedWriteScenario,
    ) -> tuple[ProvisionedRuleReadback, ...]:
        tab = self._result_tab(drawer, passed=passed)
        label = "校验通过" if passed else "校验未通过"
        text = tab.inner_text(timeout=UI_TIMEOUT_MS).strip()
        match = re.fullmatch(rf"{label}\(([0-9]+)\)", text)
        if match is None:
            message = f"实例详情必须展示规范的{label}计数"
            raise SqlMergeUiError(message)
        count = int(match.group(1))
        tab.click()
        cards = drawer.locator(".ruleView:visible")
        expect(cards).to_have_count(count, timeout=UI_TIMEOUT_MS)
        found: list[ProvisionedRuleReadback] = []
        for rule in scenario.rules:
            matches = cards.filter(has=self.page.get_by_text(rule.description, exact=True)).filter(
                has=self.page.get_by_text(rule.expected.function_name, exact=True)
            )
            if matches.count() == 1:
                expect(matches.get_by_text(rule.expected.function_name, exact=True)).to_be_visible(
                    timeout=UI_TIMEOUT_MS
                )
                found.append(rule)
        if len(found) != count:
            message = f"{label}分组含有非 canonical 子规则或遗漏规则"
            raise SqlMergeUiError(message)
        return tuple(found)

    @staticmethod
    def _structured_rule_results(
        scenario: ProvisionedWriteScenario,
        *,
        passed: tuple[ProvisionedRuleReadback, ...],
        unpassed: tuple[ProvisionedRuleReadback, ...],
    ) -> tuple[RuleExecutionReadback, ...]:
        passed_indices = {item.expected.index for item in passed}
        unpassed_indices = {item.expected.index for item in unpassed}
        expected_indices = {item.expected.index for item in scenario.rules}
        if (
            passed_indices & unpassed_indices
            or passed_indices | unpassed_indices != expected_indices
        ):
            message = "实例结果必须为每个 task-owned MonitorRule 提供唯一业务状态"
            raise SqlMergeUiError(message)
        return tuple(
            RuleExecutionReadback(
                index=item.expected.index,
                monitor_rule_id=item.monitor_rule_id,
                description=item.description,
                function_name=item.expected.function_name,
                status=(
                    RuleExecutionStatus.PASSED
                    if item.expected.index in passed_indices
                    else RuleExecutionStatus.UNPASSED
                ),
            )
            for item in scenario.rules
        )

    @staticmethod
    def _is_detail_report(response: Response) -> bool:
        return (
            response.request.method == "POST" and urlsplit(response.url).path == _DETAIL_REPORT_PATH
        )

    @staticmethod
    def _post_body(response: Response) -> dict[str, object]:
        value = cast("object", response.request.post_data_json)
        if not isinstance(value, dict):
            message = "detailReport 必须提交 JSON object"
            raise SqlMergeUiError(message)
        untyped = cast("dict[object, object]", value)
        if any(not isinstance(key, str) for key in untyped):
            message = "detailReport 必须使用文本字段名"
            raise SqlMergeUiError(message)
        return cast("dict[str, object]", untyped)

    @staticmethod
    def _result_tab(drawer: Locator, *, passed: bool) -> Locator:
        label = "校验通过" if passed else "校验未通过"
        tab = drawer.get_by_text(re.compile(rf"^{label}\([0-9]+\)$")).first
        expect(tab, f"实例详情必须展示{label}分组").to_be_visible(timeout=UI_TIMEOUT_MS)
        return tab

    @staticmethod
    def _table_snapshot(table: Locator) -> TableSnapshot:
        expect(table, "实例明细表必须可见").to_be_visible(timeout=UI_TIMEOUT_MS)
        headers = tuple(
            text.strip() for text in table.locator("thead th").all_inner_texts() if text.strip()
        )
        raw_rows = table.locator("tbody .ant-table-row")
        rows: list[tuple[str, ...]] = []
        for index in range(raw_rows.count()):
            values = tuple(
                _normalize_visible_cell(text)
                for text in raw_rows.nth(index).locator("td").all_inner_texts()
            )
            if values:
                rows.append(values[: len(headers)])
        if not rows:
            message = "实例明细必须展示至少一行不符合规则的数据"
            raise SqlMergeUiError(message)
        return TableSnapshot(headers=headers, rows=tuple(rows))


def _normalize_visible_cell(value: str) -> str:
    normalized = " ".join(value.split())
    return "" if normalized == "--" else normalized
