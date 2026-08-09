"""Typed, authenticated readback client for Data Quality identity endpoints."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Never, Protocol, cast
from urllib.parse import urlsplit

from .case_ids import SAFE_ID_RE, TIMESTAMP_RE
from .rule_contract import RulePayloadFingerprint, fingerprint_rule_payload

if TYPE_CHECKING:
    from collections.abc import Mapping

    from playwright.sync_api import Page

    from playwright_web_ui.platform_context import PlatformContext, PlatformDataSource

_RULE_SET_QUERY = "/dassets/v1/valid/monitorRuleSet/pageQuery"
_RULE_SET_DETAIL = "/dassets/v1/valid/monitorRuleSet/detail"
_TASK_QUERY = "/dassets/v1/valid/monitor/pageQuery"
_RESULT_QUERY = "/dassets/v1/valid/monitorRecord/pageQuery"
_DETAIL_REPORT = "/dassets/v1/valid/monitorRecord/detailReport"
_PACKAGE_LIST = "/dassets/v1/valid/monitor/packagelist"
_PACKAGE_SQL = "/dassets/v1/valid/monitor/packagesql"
_RESOURCE_LIST = "/dassets/v1/valid/monitor/getResourceList"
_MONITOR_RULES = "/dassets/v1/valid/monitorRule/getRules"
_PAGE_SIZE = 100
_RESULT_PASS = 3
_RESULT_UNPASS = 4
_NORMATIVE_RULE_TYPE = 3


class _JsonResponse(Protocol):
    """Minimal response shape shared by Playwright UI and request responses."""

    @property
    def ok(self) -> bool:
        """Return the HTTP success classification."""
        ...

    def json(self) -> object:
        """Decode the response body as JSON."""
        ...


class DqApiContractError(AssertionError):
    """Raised when an authenticated Data Quality endpoint violates its public shape."""


@dataclass(frozen=True, slots=True)
class PersistedRuleRecord:
    """Stable rule identity and configuration returned by rule-set detail."""

    persisted_id: str
    function_name: str
    description: str
    fields: tuple[str, ...]
    filter_expression: str | None
    strength: int
    semantic_fingerprint: RulePayloadFingerprint


@dataclass(frozen=True, slots=True)
class RulePackageRecord:
    """One persisted physical source package and its ordered rules."""

    package_name: str
    rules: tuple[PersistedRuleRecord, ...]


@dataclass(frozen=True, slots=True)
class RuleSetRecord:
    """One exact table-bound rule set."""

    rule_set_id: str
    datasource_id: int
    datasource_name: str
    schema_name: str
    table_name: str
    description: str
    packages: tuple[RulePackageRecord, ...]


@dataclass(frozen=True, slots=True)
class TaskRecord:
    """One persisted rule task with its stable monitor ID."""

    monitor_id: str
    task_name: str
    table_name: str
    datasource_id: int
    datasource_name: str
    datasource_type_name: str


@dataclass(frozen=True, slots=True)
class ResultRecord:
    """One execution record bound to a monitor, task, table, and source."""

    record_id: str
    monitor_id: str
    task_name: str
    table_name: str
    datasource_id: int
    datasource_name: str
    status: int
    execute_time: str
    finished_at: str | None

    @property
    def is_success(self) -> bool:
        """Return whether all business rules passed in terminal status 3."""
        return self.status == _RESULT_PASS

    @property
    def is_terminal(self) -> bool:
        """Return whether execution finished as business PASS(3) or UNPASS(4)."""
        return self.status in {_RESULT_PASS, _RESULT_UNPASS}


@dataclass(frozen=True, slots=True)
class PackageRecord:
    """One generated execution package returned in display order."""

    package_id: str
    package_name: str


@dataclass(frozen=True, slots=True)
class ResourceGroupRecord:
    """One exact Spark execution resource exposed to the task editor."""

    resource_id: str
    resource_name: str


@dataclass(frozen=True, slots=True)
class SourcePackageOption:
    """One table-bound source rule package exposed by the task import toolbar."""

    package_id: str
    package_name: str
    table_id: str


@dataclass(frozen=True, slots=True)
class DqApiClient:
    """Use the browser context's authenticated request client for exact identities."""

    page: Page
    platform_context: PlatformContext

    def query_rule_sets(self, *, table_name: str) -> tuple[RuleSetRecord, ...]:
        """Query table-filtered rule sets without creating or deleting records."""
        payload = self._post(
            _RULE_SET_QUERY,
            {"current": 1, "size": _PAGE_SIZE, "search": table_name},
        )
        return decode_rule_set_records(payload)

    def rule_set_detail(self, *, rule_set_id: str) -> RuleSetRecord:
        """Read the nested package/rule configuration for one stable rule-set ID."""
        payload = self._post(_RULE_SET_DETAIL, {"id": _safe_int(rule_set_id)})
        records = decode_rule_set_records(
            {"success": True, "data": {"contentList": [_envelope_data(payload)]}}
        )
        return records[0]

    def query_tasks(self, *, table_name: str) -> tuple[TaskRecord, ...]:
        """Query one canonical table and preserve every exact candidate task."""
        source = self._datasource
        payload = self._post(
            _TASK_QUERY,
            {
                "pageIndex": 1,
                "pageSize": _PAGE_SIZE,
                "tableName": table_name,
                "dataSourceId": source.assets.id,
                "projectId": self.platform_context.projects.quality.id,
            },
        )
        return decode_task_records(payload)

    def query_results(
        self,
        *,
        monitor_id: str,
        table_name: str,
        task_name: str,
    ) -> tuple[ResultRecord, ...]:
        """Query records server-side by monitor and rebind exact task/source fields."""
        source = self._datasource
        payload = self._post(
            _RESULT_QUERY,
            {
                "currentPage": 1,
                "pageSize": _PAGE_SIZE,
                "monitorId": _safe_int(monitor_id),
                "tableName": table_name,
                "fuzzyName": task_name,
                "dataSourceId": source.assets.id,
                "projectId": self.platform_context.projects.quality.id,
            },
        )
        return decode_result_records(payload)

    def detail_report(self, *, record_id: str, monitor_id: str) -> tuple[Mapping[str, object], ...]:
        """Require an exact record/monitor detail response before trusting the drawer."""
        payload = self._post(
            _DETAIL_REPORT,
            {"recordId": _safe_int(record_id), "monitorId": _safe_int(monitor_id)},
        )
        data = _envelope_data(payload)
        return tuple(
            _mapping(value, "detail-report rule") for value in _list(data, "detail report")
        )

    def package_records(self, *, monitor_id: str) -> tuple[PackageRecord, ...]:
        """Return the ordered generated SQL packages for one exact task."""
        return decode_package_records(
            self._post(_PACKAGE_LIST, {"monitorId": _safe_int(monitor_id)})
        )

    def package_sql(self, *, package_id: str) -> str:
        """Return non-empty SQL bound to one exact generated package ID."""
        payload = self._post(_PACKAGE_SQL, {"packageId": _safe_int(package_id)})
        value = _envelope_data(payload)
        if not isinstance(value, str) or not value.strip():
            _fail("package SQL response must contain non-empty text")
        return value.strip()

    def resource_groups(self) -> tuple[ResourceGroupRecord, ...]:
        """Return the explicit resource-group options used by Spark tasks."""
        return decode_resource_groups(self._post(_RESOURCE_LIST, {}))

    def monitor_rules(self, *, monitor_id: str) -> tuple[PersistedRuleRecord, ...]:
        """Read task-owned MonitorRule rows after monitor creation assigns new IDs."""
        return decode_persisted_rules(
            self._post(_MONITOR_RULES, {"monitorId": _safe_int(monitor_id)})
        )

    @staticmethod
    def imported_rules_from_response(response: _JsonResponse) -> tuple[PersistedRuleRecord, ...]:
        """Decode the exact successful browser response that populated imported rule forms."""
        return decode_persisted_rules(_response_json(response))

    @staticmethod
    def source_packages_from_response(response: _JsonResponse) -> tuple[SourcePackageOption, ...]:
        """Decode the exact source-package response that populated the task import toolbar."""
        return decode_source_package_options(_response_json(response))

    @staticmethod
    def rule_types_from_response(response: _JsonResponse) -> tuple[int, ...]:
        """Decode the exact rule-type response for selected source packages."""
        return decode_rule_types(_response_json(response))

    @staticmethod
    def created_monitor_id_from_response(response: _JsonResponse) -> str:
        """Decode the stable monitor ID returned by the final add request."""
        return _id(_envelope_data(_response_json(response)), "created monitor ID")

    @staticmethod
    def created_rule_set_id_from_response(response: _JsonResponse) -> str:
        """Decode the stable rule-set ID returned by the final add request."""
        return _id(_envelope_data(_response_json(response)), "created rule-set ID")

    @staticmethod
    def require_unused_rule_set_response(response: _JsonResponse) -> None:
        """Reject a duplicate-check response whose data represents an existing rule set."""
        value = _envelope_data(_response_json(response))
        occupied = (
            bool(value)
            if not isinstance(value, (dict, list))
            else bool(cast("dict[object, object] | list[object]", value))
        )
        if occupied:
            _fail("rule-set duplicate check must report an unused table/description identity")

    @staticmethod
    def require_unused_monitor_response(response: _JsonResponse) -> None:
        """Reject a task-name duplicate response before importing or saving rules."""
        value = _envelope_data(_response_json(response))
        if bool(value):
            _fail("monitor duplicate check must report an unused task/table identity")

    @staticmethod
    def packages_from_response(response: _JsonResponse) -> tuple[PackageRecord, ...]:
        """Decode the exact package-list response used by the SQL drawer."""
        return decode_package_records(_response_json(response))

    @staticmethod
    def package_sql_from_response(response: _JsonResponse) -> str:
        """Decode non-empty SQL from the exact drawer request."""
        value = _envelope_data(_response_json(response))
        if not isinstance(value, str) or not value.strip():
            _fail("package SQL response must contain non-empty text")
        return value.strip()

    @staticmethod
    def execution_accepted_from_response(response: _JsonResponse) -> str:
        """Require the immediate-execution endpoint's non-empty acknowledgement."""
        value = _envelope_data(_response_json(response))
        return _text(value, "immediate-execution acknowledgement")

    @staticmethod
    def results_from_response(response: _JsonResponse) -> tuple[ResultRecord, ...]:
        """Decode the exact result-page response used to render the queried row."""
        return decode_result_records(_response_json(response))

    @staticmethod
    def detail_report_from_response(response: _JsonResponse) -> tuple[Mapping[str, object], ...]:
        """Decode the exact result detail response that populated the report Drawer."""
        data = _envelope_data(_response_json(response))
        return tuple(
            _mapping(value, "detail-report rule") for value in _list(data, "detail report")
        )

    @property
    def _datasource(self) -> PlatformDataSource:
        key = self.platform_context.defaults.datasource
        source = self.platform_context.datasources.get(key)
        if source is None:
            _fail("default datasource must resolve before API readback")
        return source

    def _post(self, path: str, data: Mapping[str, object]) -> object:
        parts = urlsplit(self.platform_context.urls.assets_base_url)
        origin = f"{parts.scheme}://{parts.netloc}"
        response = self.page.context.request.post(
            f"{origin}{path}",
            data=dict(data),
            headers={"X-Valid-Project-ID": str(self.platform_context.projects.quality.id)},
        )
        return _response_json(response)


def decode_rule_set_records(payload: object) -> tuple[RuleSetRecord, ...]:
    """Decode rule-set page/detail data without tolerating legacy response aliases."""
    data = _mapping(_envelope_data(payload), "rule-set page")
    values = _list(data.get("contentList"), "rule-set contentList")
    return tuple(_decode_rule_set(value) for value in values)


def decode_task_records(payload: object) -> tuple[TaskRecord, ...]:
    """Decode task-page data with stable monitor IDs."""
    data = _mapping(_envelope_data(payload), "task page")
    values = _list(data.get("data"), "task page data")
    return tuple(
        TaskRecord(
            monitor_id=_id(item.get("id"), "task monitor ID"),
            task_name=_text(item.get("ruleName"), "task name"),
            table_name=_text(item.get("tableName"), "task table"),
            datasource_id=_integer(item.get("sourceId"), "task datasource ID"),
            datasource_name=_text(item.get("dataName"), "task datasource name"),
            datasource_type_name=_text(item.get("sourceTypeName"), "task datasource type"),
        )
        for value in values
        if (item := _mapping(value, "task record"))
    )


def decode_result_records(payload: object) -> tuple[ResultRecord, ...]:
    """Decode result-page data while preserving record and monitor identity."""
    data = _mapping(_envelope_data(payload), "result page")
    values = _list(data.get("data"), "result page data")
    records: list[ResultRecord] = []
    for value in values:
        item = _mapping(value, "result record")
        finished = item.get("execEndTime")
        if finished is not None and (
            not isinstance(finished, str) or TIMESTAMP_RE.fullmatch(finished) is None
        ):
            _fail("result finish time must use yyyy-MM-dd HH:mm:ss")
        records.append(
            ResultRecord(
                record_id=_id(item.get("id"), "result record ID"),
                monitor_id=_id(item.get("monitorId"), "result monitor ID"),
                task_name=_text(item.get("ruleName"), "result task name"),
                table_name=_text(item.get("tableName"), "result table"),
                datasource_id=_integer(item.get("dataSourceId"), "result datasource ID"),
                datasource_name=_text(item.get("sourceName"), "result datasource name"),
                status=_integer(item.get("status"), "result status"),
                execute_time=_timestamp(item.get("executeTime"), "result execute time"),
                finished_at=finished,
            )
        )
    return tuple(records)


def decode_package_records(payload: object) -> tuple[PackageRecord, ...]:
    """Decode generated package IDs and names in backend display order."""
    values = _list(_envelope_data(payload), "package list")
    return tuple(
        PackageRecord(
            package_id=_id(item.get("packageId"), "package ID"),
            package_name=_text(item.get("packageName"), "package name"),
        )
        for value in values
        if (item := _mapping(value, "package record"))
    )


def decode_persisted_rules(payload: object) -> tuple[PersistedRuleRecord, ...]:
    """Decode one exact imported-rule response from ``getMonitorRule``."""
    return tuple(
        rule
        for value in _list(_envelope_data(payload), "imported rules")
        for rule in _decode_persisted_rule_group(value)
    )


def decode_resource_groups(payload: object) -> tuple[ResourceGroupRecord, ...]:
    """Decode Spark resource groups without selecting an implicit first option."""
    return tuple(
        ResourceGroupRecord(
            resource_id=_id(item.get("yarnResourceId"), "resource-group ID"),
            resource_name=_text(item.get("yarnResourceName"), "resource-group name"),
        )
        for value in _list(_envelope_data(payload), "resource groups")
        if (item := _mapping(value, "resource-group record"))
    )


def decode_source_package_options(payload: object) -> tuple[SourcePackageOption, ...]:
    """Decode raw ``ruleSetList`` data before the frontend normalizes ``id``."""
    return tuple(
        SourcePackageOption(
            package_id=_id(item.get("id"), "source-package ID"),
            package_name=_text(item.get("packageName"), "source-package name"),
            table_id=_id(item.get("tableId"), "source-package table ID"),
        )
        for value in _list(_envelope_data(payload), "source-package options")
        if (item := _mapping(value, "source-package option"))
    )


def decode_rule_types(payload: object) -> tuple[int, ...]:
    """Decode unique backend rule-type values for the selected package set."""
    values = tuple(
        _integer(value, "rule type") for value in _list(_envelope_data(payload), "rule types")
    )
    if not values or len(set(values)) != len(values):
        _fail("rule types must be non-empty and unique")
    return values


def _decode_rule_set(value: object) -> RuleSetRecord:
    item = _mapping(value, "rule-set record")
    packages = tuple(
        _decode_rule_package(package)
        for package in _list(item.get("packageVOList", []), "packages")
    )
    return RuleSetRecord(
        rule_set_id=_id(item.get("id"), "rule-set ID"),
        datasource_id=_integer(item.get("dataSourceId"), "rule-set datasource ID"),
        datasource_name=_text(item.get("sourceName"), "rule-set datasource name"),
        schema_name=_text(item.get("schemaName"), "rule-set schema"),
        table_name=_text(item.get("tableName"), "rule-set table"),
        description=_string(item.get("description"), "rule-set description"),
        packages=packages,
    )


def _decode_rule_package(value: object) -> RulePackageRecord:
    item = _mapping(value, "rule package")
    return RulePackageRecord(
        package_name=_text(item.get("packageName"), "package name"),
        rules=tuple(
            executable
            for rule in _list(item.get("rules"), "package rules")
            for executable in _decode_persisted_rule_group(rule)
        ),
    )


def _decode_persisted_rule_group(value: object) -> tuple[PersistedRuleRecord, ...]:
    """Flatten a NORMATIVE parent card to its real persisted child record IDs."""
    item = _mapping(value, "persisted rule")
    raw_children = item.get("standardRules")
    if raw_children is None:
        return (_decode_persisted_rule(item),)
    children = _list(raw_children, "normative persisted standardRules")
    if item.get("type") != _NORMATIVE_RULE_TYPE or not children:
        _fail("normative persisted parent must expose non-empty standardRules")
    shared = {
        key: item[key]
        for key in ("columnName", "ruleStrength", "description", "isStandard", "type")
        if key in item
    }
    records: list[PersistedRuleRecord] = []
    for raw_child in children:
        child = {**shared, **_mapping(raw_child, "normative persisted child")}
        records.append(_decode_persisted_rule(child))
    return tuple(records)


def _decode_persisted_rule(value: object) -> PersistedRuleRecord:
    item = _mapping(value, "persisted executable rule")
    raw_fields = item.get("columnName", [])
    if isinstance(raw_fields, str):
        fields = tuple(part.strip() for part in raw_fields.split(",") if part.strip())
    else:
        fields = tuple(_text(field, "rule field") for field in _list(raw_fields, "rule fields"))
    filter_value = item.get("filter")
    if filter_value is not None and not isinstance(filter_value, str):
        _fail("rule filter must be text or null")
    persisted_id = _id(item.get("id"), "persisted rule ID")
    if not persisted_id.isdigit() or int(persisted_id) < 1:
        _fail("persisted rule ID must be a positive numeric identifier")
    return PersistedRuleRecord(
        persisted_id=persisted_id,
        function_name=_text(item.get("functionName"), "rule function"),
        description=_text(item.get("description"), "rule description"),
        fields=fields,
        filter_expression=filter_value,
        strength=_integer(item.get("ruleStrength"), "rule strength"),
        semantic_fingerprint=fingerprint_rule_payload(item),
    )


def _response_json(response: _JsonResponse) -> object:
    if not response.ok:
        _fail("Data Quality API request must return a successful HTTP response")
    try:
        return response.json()
    except (TypeError, ValueError) as error:
        message = "Data Quality API response must contain JSON"
        raise DqApiContractError(message) from error


def _envelope_data(payload: object) -> object:
    envelope = _mapping(payload, "response envelope")
    if envelope.get("success") is not True or "data" not in envelope:
        _fail("Data Quality response must be successful and contain data")
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
    if not isinstance(value, str) or not value.strip():
        _fail(f"{label} must be non-empty text")
    return value.strip()


def _string(value: object, label: str) -> str:
    if not isinstance(value, str):
        _fail(f"{label} must be text")
    return value.strip()


def _integer(value: object, label: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        _fail(f"{label} must be an integer")
    return value


def _id(value: object, label: str) -> str:
    if isinstance(value, bool) or not isinstance(value, (int, str)):
        _fail(f"{label} must be a safe identifier")
    result = str(value)
    if SAFE_ID_RE.fullmatch(result) is None:
        _fail(f"{label} must be a safe identifier")
    return result


def _safe_int(value: str) -> int:
    if SAFE_ID_RE.fullmatch(value) is None or not value.isdigit():
        _fail("endpoint identity must be a positive numeric identifier")
    result = int(value)
    if result < 1:
        _fail("endpoint identity must be a positive numeric identifier")
    return result


def _timestamp(value: object, label: str) -> str:
    result = _text(value, label)
    if TIMESTAMP_RE.fullmatch(result) is None:
        _fail(f"{label} must use yyyy-MM-dd HH:mm:ss")
    return result


def _fail(message: str) -> Never:
    raise DqApiContractError(message)
