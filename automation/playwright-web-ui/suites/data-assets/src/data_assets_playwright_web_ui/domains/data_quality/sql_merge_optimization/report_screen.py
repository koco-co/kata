"""Generated quality-report UI capabilities for SQL-merge journeys."""

from __future__ import annotations

import re
import time
from collections import Counter
from dataclasses import dataclass
from typing import TYPE_CHECKING, Final, cast
from urllib.parse import urlsplit

from playwright.sync_api import expect

from .report_api import QualityReportApi
from .report_models import (
    GeneratedReportDetail,
    GeneratedReportRecord,
    ReportBaseline,
    ReportRuleRecord,
    ReportTableRecord,
)
from .screen_base import UI_TIMEOUT_MS, SqlMergeScreenBase, SqlMergeUiError

if TYPE_CHECKING:
    from playwright.sync_api import Locator, Response

    from .write_models import ProvisionedRuleReadback, ProvisionedWriteScenario

_REPORT_LIST_PATH: Final = "/dassets/v1/valid/monitorReportRecord/pageList"
_REPORT_DETAIL_PATH: Final = "/dassets/v1/valid/monitorReportRecord/reportRecordDetail"
_REPORT_TIMEOUT_MS: Final = 600_000
_POLL_INTERVAL_MS: Final = 2_000
_RULE_STATUS_LABELS: Final = {3: "校验通过", 4: "校验未通过", 11: "校验失败"}
_PASS_STATUS: Final = 3
_UNPASS_STATUS: Final = 4
_CHECK_ABNORMAL_STATUS: Final = 11
_TABLE_RULE_LEVEL: Final = 1
_BASE_RULE_HEADERS: Final = (
    "规则类型",
    "规则名称",
    "质验结果",
    "未通过原因",
    "详情说明",
    "最近一次校验结束时间",
    "操作",
)


@dataclass(frozen=True, slots=True)
class SqlMergeReportScreen(SqlMergeScreenBase):
    """Bind a generated report to the current execution and every persisted rule."""

    @property
    def api(self) -> QualityReportApi:
        """Return the authenticated generated-report client."""
        return QualityReportApi(self.page, self.navigation.platform_context)

    def report_baseline(self, scenario: ProvisionedWriteScenario) -> ReportBaseline:
        """Capture exact report IDs before submitting the current task execution."""
        records = self._exact_api_records(scenario)
        return ReportBaseline(record_ids=tuple(record.record_id for record in records))

    def open_fresh_report(
        self,
        scenario: ProvisionedWriteScenario,
        *,
        baseline: ReportBaseline,
    ) -> tuple[Locator, GeneratedReportDetail]:
        """Open the unique successful report created after the execution baseline."""
        record = self._wait_for_new_success(scenario, baseline=baseline)
        root, detail = self._open_exact_generated_report(record)
        self._assert_write_detail(detail, scenario=scenario)
        return root, detail

    def expect_write_report(
        self,
        *,
        root: Locator,
        detail: GeneratedReportDetail,
        scenario: ProvisionedWriteScenario,
    ) -> None:
        """Assert report summary and every rule row against the exact API readback."""
        table = self._write_table(detail, scenario=scenario)
        heading = self._summary_heading(table)
        inspection = root.locator(".qualityInspection").filter(
            has=self.page.get_by_text(heading, exact=True)
        )
        expect(inspection, "报告详情必须唯一展示本次任务表汇总").to_have_count(
            1,
            timeout=UI_TIMEOUT_MS,
        )
        expect(root.get_by_text(detail.report_name, exact=True).first).to_be_visible(
            timeout=UI_TIMEOUT_MS
        )
        self._expect_summary(inspection, table=table, include_vehicle=detail.include_vehicle)
        self._expect_rule_rows(inspection, table=table, scenario=scenario)

    def _exact_api_records(
        self,
        scenario: ProvisionedWriteScenario,
    ) -> tuple[GeneratedReportRecord, ...]:
        return tuple(
            record
            for record in self.api.query(
                report_name=scenario.names.report_name,
                table_name=scenario.source.table_name,
            )
            if record.report_name == scenario.names.report_name
            and record.table_names == scenario.source.table_name
        )

    def _wait_for_new_success(
        self,
        scenario: ProvisionedWriteScenario,
        *,
        baseline: ReportBaseline,
    ) -> GeneratedReportRecord:
        deadline = time.monotonic() + (_REPORT_TIMEOUT_MS / 1_000)
        while time.monotonic() < deadline:
            fresh = tuple(
                record
                for record in self._exact_api_records(scenario)
                if record.record_id not in baseline.record_ids
            )
            if len(fresh) > 1:
                message = "一次任务执行不得为唯一报告名生成多个新增 reportRecordId"
                raise SqlMergeUiError(message)
            if fresh and fresh[0].is_terminal:
                record = fresh[0]
                if not record.is_success or record.finished_at is None:
                    message = "本次唯一新增质量报告必须达到生成成功终态"
                    raise SqlMergeUiError(message)
                return record
            self.page.wait_for_timeout(_POLL_INTERVAL_MS)
        message = "等待本次唯一新增质量报告达到生成成功终态超时"
        raise SqlMergeUiError(message)

    def _open_exact_generated_report(
        self,
        record: GeneratedReportRecord,
    ) -> tuple[Locator, GeneratedReportDetail]:
        self.navigation.open("/dq/qualityReport", landmark="数据质量报告")
        page_root = self.page.locator(".quality-report")
        expect(page_root, "数据质量报告页面必须加载").to_be_visible(timeout=UI_TIMEOUT_MS)
        with self.page.expect_response(self._is_report_list, timeout=UI_TIMEOUT_MS) as initial_info:
            page_root.get_by_role("tab", name="已生成报告", exact=True).click()
        self._require_success(initial_info.value, operation="打开已生成报告")

        page_root.get_by_placeholder("请输入报告名称", exact=True).fill(record.report_name)
        page_root.get_by_placeholder("请输入数据表名", exact=True).fill(record.table_names)
        with self.page.expect_response(self._is_report_list, timeout=UI_TIMEOUT_MS) as search_info:
            page_root.get_by_role("button", name="查询", exact=True).click()
        response = search_info.value
        self._require_success(response, operation="查询已生成报告")
        self._assert_search_body(response, record=record)
        rendered = tuple(
            item
            for item in self.api.records_from_response(response)
            if item.record_id == record.record_id
        )
        if rendered != (record,):
            message = "已生成报告 pageList 必须返回本次精确 reportRecordId 记录"
            raise SqlMergeUiError(message)

        row = (
            page_root.locator(f'.ant-table-tbody .ant-table-row[data-row-key="{record.record_id}"]')
            .filter(has=self.page.get_by_text(record.report_name, exact=True))
            .filter(has=self.page.get_by_text(record.table_names, exact=True))
        )
        expect(row, "已生成报告列表必须唯一渲染本次 reportRecordId").to_have_count(
            1,
            timeout=UI_TIMEOUT_MS,
        )
        with self.page.expect_response(
            self._is_report_detail,
            timeout=UI_TIMEOUT_MS,
        ) as detail_info:
            row.get_by_role("button", name="报告详情", exact=True).click()
        detail_response = detail_info.value
        self._require_success(detail_response, operation="打开报告详情")
        if self._post_body(detail_response) != {"id": int(record.record_id)}:
            message = "reportRecordDetail 必须按本次精确 reportRecordId 查询"
            raise SqlMergeUiError(message)
        detail = self.api.detail_from_response(detail_response)
        if (
            detail.record_id != record.record_id
            or detail.report_name != record.report_name
            or detail.finished_at != record.finished_at
        ):
            message = "报告详情必须回传列表所选 reportRecordId/name/finish time"
            raise SqlMergeUiError(message)
        expect(self.page).to_have_url(
            re.compile(r"#/dq/qualityReportDetail(?:\?|$)"),
            timeout=UI_TIMEOUT_MS,
        )
        root = self.page.locator(".quality-report-detail")
        expect(root, "本次质量报告详情必须加载").to_be_visible(timeout=UI_TIMEOUT_MS)
        self.wait_for_spin(root)
        return root, detail

    def _assert_write_detail(
        self,
        detail: GeneratedReportDetail,
        *,
        scenario: ProvisionedWriteScenario,
    ) -> None:
        if detail.report_name != scenario.names.report_name or len(detail.tables) != 1:
            message = "本次报告必须绑定唯一 runtime report name 和单一任务表"
            raise SqlMergeUiError(message)
        table = self._write_table(detail, scenario=scenario)
        if (
            table.table_name != scenario.source.table_name
            or table.task_name != scenario.task_name
            or table.datasource_name != self.datasource.name
            or table.schema_name != self.datasource.schema
            or table.rule_count != scenario.source.rule_count
        ):
            message = "报告表汇总必须精确绑定本次 task/table/datasource/schema/ruleCount"
            raise SqlMergeUiError(message)
        expected_by_id = {rule.monitor_rule_id: rule for rule in scenario.rules}
        if set(expected_by_id) != {rule.rule_id for rule in table.rules}:
            message = "报告规则行必须由本次规则集全部 persisted ruleId 精确组成"
            raise SqlMergeUiError(message)
        for row in table.rules:
            expected = expected_by_id[row.rule_id]
            if (
                row.function_name != expected.expected.function_name
                or row.rule_description != expected.description
            ):
                message = "报告规则行 function/description 必须匹配本次 typed 配置"
                raise SqlMergeUiError(message)
        result = scenario.source.result
        if result.has_explicit_matrix:
            passed_ids = {
                scenario.rules[index - 1].monitor_rule_id for index in result.passed_rules
            }
            unpassed_ids = {
                scenario.rules[index - 1].monitor_rule_id for index in result.unpassed_rules
            }
            actual_passed = {row.rule_id for row in table.rules if row.status == _PASS_STATUS}
            actual_unpassed = {row.rule_id for row in table.rules if row.status == _UNPASS_STATUS}
            if actual_passed != passed_ids or actual_unpassed != unpassed_ids:
                message = "报告 PASS/UNPASS ruleId 必须精确匹配 canonical 结果矩阵"
                raise SqlMergeUiError(message)
            expected_rate = len(passed_ids) * 100 / scenario.source.rule_count
            if table.pass_rate != expected_rate:
                message = "报告校验通过率必须由本次逐规则结果精确计算"
                raise SqlMergeUiError(message)

    def _expect_summary(
        self,
        inspection: Locator,
        *,
        table: ReportTableRecord,
        include_vehicle: bool,
    ) -> None:
        expect(inspection.get_by_text(table.table_name, exact=True).first).to_be_visible(
            timeout=UI_TIMEOUT_MS
        )
        for label, value in (
            ("数据源：", table.datasource_name),  # noqa: RUF001
            ("数据库：", table.schema_name),  # noqa: RUF001
            ("检测数据范围：", table.partition_value or "--"),  # noqa: RUF001
        ):
            self.expect_labeled_value(inspection, label=label, value=value)
        for label, value in (
            ("表行数", table.table_rows),
            ("抽样行数", table.sample_count),
            ("字段数", table.field_count),
            ("校验规则数", table.rule_count),
        ):
            self._expect_statistic(inspection, label=label, value=str(value))
        self._expect_statistic(
            inspection,
            label="校验通过率",
            value=f"{_number_text(table.pass_rate)}%",
        )
        vehicle_heading = inspection.get_by_text("车辆信息汇总", exact=True)
        if include_vehicle:
            expect(vehicle_heading, "开启车辆报告时必须展示车辆信息汇总").to_be_visible(
                timeout=UI_TIMEOUT_MS
            )
            self._expect_statistic(inspection, label="车辆数", value=str(table.vehicle_count))
        else:
            expect(vehicle_heading, "未开启车辆报告时不得伪造车辆信息汇总").to_have_count(0)
        expect(inspection.get_by_text("数据源类型", exact=True)).to_have_count(0)

    def _expect_rule_rows(
        self,
        inspection: Locator,
        *,
        table: ReportTableRecord,
        scenario: ProvisionedWriteScenario,
    ) -> None:
        expect(inspection.get_by_text("规则校验明细", exact=True)).to_be_visible(
            timeout=UI_TIMEOUT_MS
        )
        for header in _BASE_RULE_HEADERS:
            expect(inspection.get_by_text(header, exact=True).first).to_be_visible(
                timeout=UI_TIMEOUT_MS
            )
        if any(rule.column_name is not None for rule in table.rules):
            for header in ("字段名称", "字段类型"):
                expect(inspection.get_by_text(header, exact=True).first).to_be_visible(
                    timeout=UI_TIMEOUT_MS
                )
        rows = inspection.locator(".dt-table-border .ant-table-tbody .ant-table-row")
        expect(rows, "报告规则明细必须逐行覆盖全部本次规则").to_have_count(
            table.rule_count,
            timeout=UI_TIMEOUT_MS,
        )
        expected_by_id = {rule.monitor_rule_id: rule for rule in scenario.rules}
        expected_signatures = Counter(
            self._row_signature(rule, expected_by_id=expected_by_id) for rule in table.rules
        )
        for signature, count in expected_signatures.items():
            category, function, column, column_type, status, failure, detail, finished = signature
            matches = rows.filter(has=self.page.get_by_text(category, exact=True)).filter(
                has=self.page.get_by_text(function, exact=True)
            )
            for value in (column, column_type, status, failure, detail, finished):
                if value:
                    matches = matches.filter(has=self.page.get_by_text(value, exact=True))
            expect(matches, f"报告规则明细必须精确绑定 {function} 的全部列").to_have_count(
                count,
                timeout=UI_TIMEOUT_MS,
            )
        for rule in table.rules:
            row = self._row_locator(rows, rule=rule, expected_by_id=expected_by_id)
            if rule.status == _UNPASS_STATUS and rule.level != _TABLE_RULE_LEVEL:
                expect(row.get_by_role("button", name="查看详情", exact=True)).to_be_enabled(
                    timeout=UI_TIMEOUT_MS
                )
            elif rule.status == _CHECK_ABNORMAL_STATUS:
                expect(row.get_by_role("button", name="查看日志", exact=True)).to_be_enabled(
                    timeout=UI_TIMEOUT_MS
                )

    def _row_locator(
        self,
        rows: Locator,
        *,
        rule: ReportRuleRecord,
        expected_by_id: dict[str, ProvisionedRuleReadback],
    ) -> Locator:
        signature = self._row_signature(rule, expected_by_id=expected_by_id)
        category, function, column, column_type, status, failure, detail, finished = signature
        matches = rows.filter(has=self.page.get_by_text(category, exact=True)).filter(
            has=self.page.get_by_text(function, exact=True)
        )
        for value in (column, column_type, status, failure, detail, finished):
            if value:
                matches = matches.filter(has=self.page.get_by_text(value, exact=True))
        return matches.first

    def _row_signature(
        self,
        rule: ReportRuleRecord,
        *,
        expected_by_id: dict[str, ProvisionedRuleReadback],
    ) -> tuple[str, str, str, str, str, str, str, str]:
        expected = expected_by_id[rule.rule_id].expected
        return (
            expected.category.value,
            rule.function_name,
            rule.column_name or "",
            rule.column_type or "",
            _RULE_STATUS_LABELS[rule.status],
            rule.failure_reason,
            rule.detail,
            self._browser_timestamp(rule.finished_at_epoch_ms),
        )

    def _browser_timestamp(self, epoch_millis: int) -> str:
        value = self.page.evaluate(
            """value => {
                const date = new Date(value);
                const pad = part => String(part).padStart(2, '0');
                return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
                    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
            }""",
            epoch_millis,
        )
        if not isinstance(value, str):
            message = "浏览器必须把报告规则完成时间格式化为文本"
            raise SqlMergeUiError(message)
        return value

    @staticmethod
    def _summary_heading(table: ReportTableRecord) -> str:
        suffix = f"--{table.partition_value}" if table.partition_value else ""
        return f"质量评估汇总({table.table_name}_{table.task_name}{suffix})"

    @staticmethod
    def _write_table(
        detail: GeneratedReportDetail,
        *,
        scenario: ProvisionedWriteScenario,
    ) -> ReportTableRecord:
        matches = tuple(
            table
            for table in detail.tables
            if table.table_name == scenario.source.table_name
            and table.task_name == scenario.task_name
        )
        if len(matches) != 1:
            message = "报告详情必须唯一绑定本次 task/table"
            raise SqlMergeUiError(message)
        return matches[0]

    @staticmethod
    def _expect_statistic(root: Locator, *, label: str, value: str) -> None:
        item = root.locator(".statistics__item").filter(has=root.get_by_text(label, exact=True))
        expect(item, f"报告汇总必须唯一展示“{label}”").to_have_count(1, timeout=UI_TIMEOUT_MS)
        expect(item.get_by_text(value, exact=True), f"报告“{label}”必须回显 {value}").to_be_visible(
            timeout=UI_TIMEOUT_MS
        )

    @staticmethod
    def _is_report_list(response: Response) -> bool:
        return (
            response.request.method == "POST" and urlsplit(response.url).path == _REPORT_LIST_PATH
        )

    @staticmethod
    def _is_report_detail(response: Response) -> bool:
        return (
            response.request.method == "POST" and urlsplit(response.url).path == _REPORT_DETAIL_PATH
        )

    @staticmethod
    def _require_success(response: Response, *, operation: str) -> None:
        if not response.ok:
            message = f"{operation}必须返回成功 HTTP 响应"
            raise SqlMergeUiError(message)

    @classmethod
    def _assert_search_body(
        cls,
        response: Response,
        *,
        record: GeneratedReportRecord,
    ) -> None:
        body = cls._post_body(response)
        required: dict[str, object] = {
            "current": 1,
            "search": record.report_name,
            "tableName": record.table_names,
            "status": [],
            "reportType": [],
            "ruleTaskTypesList": [],
        }
        if any(body.get(key) != value for key, value in required.items()):
            message = "已生成报告查询必须提交精确 report name/table 和空筛选条件"
            raise SqlMergeUiError(message)
        size = body.get("size")
        if isinstance(size, bool) or not isinstance(size, int) or size < 1:
            message = "已生成报告查询必须提交正整数分页大小"
            raise SqlMergeUiError(message)

    @staticmethod
    def _post_body(response: Response) -> dict[str, object]:
        value = cast("object", response.request.post_data_json)
        if not isinstance(value, dict):
            message = "质量报告端点必须提交 JSON object"
            raise SqlMergeUiError(message)
        untyped = cast("dict[object, object]", value)
        if any(not isinstance(key, str) for key in untyped):
            message = "质量报告端点必须使用文本字段名"
            raise SqlMergeUiError(message)
        return cast("dict[str, object]", untyped)


def _number_text(value: float) -> str:
    return str(int(value)) if value.is_integer() else str(value)
