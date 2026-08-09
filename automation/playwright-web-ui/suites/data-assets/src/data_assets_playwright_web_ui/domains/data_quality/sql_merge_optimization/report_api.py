"""Strict quality-report API readbacks using the browser's authenticated context."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Never, Protocol, cast
from urllib.parse import urlsplit

from .case_ids import SAFE_ID_RE, TIMESTAMP_RE
from .report_models import (
    GeneratedReportDetail,
    GeneratedReportRecord,
    ReportRuleRecord,
    ReportTableRecord,
)

if TYPE_CHECKING:
    from collections.abc import Mapping

    from playwright.sync_api import Page

    from playwright_web_ui.platform_context import PlatformContext

_REPORT_LIST = "/dassets/v1/valid/monitorReportRecord/pageList"
_REPORT_DETAIL = "/dassets/v1/valid/monitorReportRecord/reportRecordDetail"
_PAGE_SIZE = 100


class _JsonResponse(Protocol):
    @property
    def ok(self) -> bool: ...

    def json(self) -> object: ...


class ReportApiContractError(AssertionError):
    """Raised when generated-report endpoints violate their current contract."""


@dataclass(frozen=True, slots=True)
class QualityReportApi:
    """Query report identities without relying on list ordering or visible text guesses."""

    page: Page
    platform_context: PlatformContext

    def query(self, *, report_name: str, table_name: str) -> tuple[GeneratedReportRecord, ...]:
        """Query the exact runtime report name and canonical table."""
        return decode_report_records(
            self._post(
                _REPORT_LIST,
                {
                    "current": 1,
                    "size": _PAGE_SIZE,
                    "search": report_name,
                    "tableName": table_name,
                    "status": [],
                    "reportType": [],
                    "ruleTaskTypesList": [],
                },
            )
        )

    def detail(self, *, record_id: str) -> GeneratedReportDetail:
        """Read one exact successful generated-report detail."""
        return decode_report_detail(self._post(_REPORT_DETAIL, {"id": _safe_int(record_id)}))

    @staticmethod
    def records_from_response(response: _JsonResponse) -> tuple[GeneratedReportRecord, ...]:
        """Decode the exact response used to render the generated-report list."""
        return decode_report_records(_response_json(response))

    @staticmethod
    def detail_from_response(response: _JsonResponse) -> GeneratedReportDetail:
        """Decode the exact response used to render report detail."""
        return decode_report_detail(_response_json(response))

    def _post(self, path: str, data: Mapping[str, object]) -> object:
        parts = urlsplit(self.platform_context.urls.assets_base_url)
        origin = f"{parts.scheme}://{parts.netloc}"
        response = self.page.context.request.post(
            f"{origin}{path}",
            data=dict(data),
            headers={"X-Valid-Project-ID": str(self.platform_context.projects.quality.id)},
        )
        return _response_json(response)


def decode_report_records(payload: object) -> tuple[GeneratedReportRecord, ...]:
    """Decode generated-report page records and their stable IDs/statuses."""
    page = _mapping(_data(payload), "generated-report page")
    return tuple(
        GeneratedReportRecord(
            record_id=_id(item.get("id"), "report record ID"),
            report_name=_text(item.get("reportName"), "report name"),
            table_names=_text(item.get("tableNames"), "report table names"),
            status=_integer(item.get("status"), "report status"),
            finished_at=_optional_timestamp(item.get("execEndTime"), "report finish time"),
        )
        for value in _list(page.get("contentList"), "generated-report contentList")
        if (item := _mapping(value, "generated-report record"))
    )


def decode_report_detail(payload: object) -> GeneratedReportDetail:
    """Decode one report survey and every rule row without response aliases."""
    data = _mapping(_data(payload), "generated-report detail")
    tables = tuple(
        _decode_report_table(value)
        for value in _list(data.get("reportTableList"), "report table list")
    )
    return GeneratedReportDetail(
        record_id=_id(data.get("reportRecordId"), "report detail ID"),
        report_name=_text(data.get("reportName"), "report detail name"),
        finished_at=_timestamp(data.get("execEndTime"), "report detail finish time"),
        include_vehicle=_integer(data.get("needCar"), "needCar") == 1,
        tables=tables,
    )


def _decode_report_table(value: object) -> ReportTableRecord:
    item = _mapping(value, "report table")
    survey = _mapping(item.get("reportTableSurvey"), "report table survey")
    result = _mapping(item.get("ruleResultDTO"), "ruleResultDTO")
    rules = tuple(
        _decode_report_rule(rule)
        for key in ("multiTableRule", "singleTableRule", "columnRule")
        for rule in _list(result.get(key), key)
    )
    return ReportTableRecord(
        table_name=_text(survey.get("tableName"), "survey table"),
        task_name=_text(survey.get("ruleName"), "survey task"),
        datasource_name=_text(survey.get("datasourceName"), "survey datasource"),
        schema_name=_text(survey.get("schemaName"), "survey schema"),
        partition_value=_string(survey.get("partitionValue"), "survey partition"),
        table_rows=_integer(survey.get("tableRows"), "survey table rows"),
        sample_count=_integer(survey.get("sampleCount"), "survey sample count"),
        vehicle_count=_integer(survey.get("vehicleCount"), "survey vehicle count"),
        field_count=_integer(survey.get("fieldCount"), "survey field count"),
        rule_count=_integer(survey.get("ruleCount"), "survey rule count"),
        pass_rate=_number(survey.get("verifyPassRate"), "survey pass rate"),
        rules=rules,
    )


def _decode_report_rule(value: object) -> ReportRuleRecord:
    item = _mapping(value, "report rule")
    return ReportRuleRecord(
        record_id=_id(item.get("recordId"), "report rule record ID"),
        rule_id=_id(item.get("ruleId"), "report rule ID"),
        function_type=_text(item.get("functionType"), "report rule type"),
        function_name=_text(item.get("functionName"), "report rule name"),
        rule_description=_string(item.get("ruleDesc"), "report rule description"),
        column_name=_optional_text(item.get("columnName"), "report column name"),
        column_type=_optional_text(item.get("columnType"), "report column type"),
        status=_integer(item.get("status"), "report rule status"),
        failure_reason=_string(item.get("runFailDetail"), "report failure reason"),
        detail=_string(item.get("checkDetail"), "report detail"),
        finished_at_epoch_ms=_epoch_millis(item.get("gmtCreate"), "report rule finish time"),
        level=_integer(item.get("level"), "report rule level"),
    )


def _response_json(response: _JsonResponse) -> object:
    if not response.ok:
        _fail("quality-report request must return successful HTTP status")
    try:
        return response.json()
    except (TypeError, ValueError) as error:
        message = "quality-report response must contain JSON"
        raise ReportApiContractError(message) from error


def _data(payload: object) -> object:
    envelope = _mapping(payload, "response envelope")
    if envelope.get("success") is not True or "data" not in envelope:
        _fail("quality-report response must be successful and contain data")
    return envelope["data"]


def _mapping(value: object, label: str) -> Mapping[str, object]:
    if not isinstance(value, dict):
        _fail(f"{label} must be an object")
    untyped = cast("dict[object, object]", value)
    if any(not isinstance(key, str) for key in untyped):
        _fail(f"{label} must use text keys")
    return cast("Mapping[str, object]", untyped)


def _list(value: object, label: str) -> list[object]:
    if not isinstance(value, list):
        _fail(f"{label} must be an array")
    return cast("list[object]", value)


def _text(value: object, label: str) -> str:
    result = _string(value, label)
    if not result:
        _fail(f"{label} must be non-empty text")
    return result


def _string(value: object, label: str) -> str:
    if not isinstance(value, str):
        _fail(f"{label} must be text")
    return value.strip()


def _optional_text(value: object, label: str) -> str | None:
    if value is None:
        return None
    return _string(value, label)


def _integer(value: object, label: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        _fail(f"{label} must be an integer")
    return value


def _number(value: object, label: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        _fail(f"{label} must be numeric")
    return float(value)


def _id(value: object, label: str) -> str:
    if isinstance(value, bool) or not isinstance(value, (int, str)):
        _fail(f"{label} must be a safe ID")
    result = str(value)
    if SAFE_ID_RE.fullmatch(result) is None:
        _fail(f"{label} must be a safe ID")
    return result


def _safe_int(value: str) -> int:
    if not value.isdigit() or int(value) < 1:
        _fail("report endpoint ID must be a positive integer")
    return int(value)


def _timestamp(value: object, label: str) -> str:
    result = _text(value, label)
    if TIMESTAMP_RE.fullmatch(result) is None:
        _fail(f"{label} must use yyyy-MM-dd HH:mm:ss")
    return result


def _optional_timestamp(value: object, label: str) -> str | None:
    if value in {None, ""}:
        return None
    return _timestamp(value, label)


def _epoch_millis(value: object, label: str) -> int:
    number = _integer(value, label)
    if number < 1:
        _fail(f"{label} must be positive epoch milliseconds")
    return number


def _fail(message: str) -> Never:
    raise ReportApiContractError(message)
