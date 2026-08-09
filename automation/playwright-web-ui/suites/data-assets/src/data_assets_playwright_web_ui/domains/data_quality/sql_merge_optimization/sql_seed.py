"""Controlled Spark table seeding through the authenticated platform Batch API."""

from __future__ import annotations

import base64
import re
from dataclasses import dataclass, field
from datetime import date
from time import monotonic, sleep
from typing import TYPE_CHECKING, Never, Protocol, cast

from .sql_seed_model import (
    SparkCleanupReceipt,
    SparkColumn,
    SparkColumnType,
    SparkPartitionRows,
    SparkSeedPlan,
    SparkSeedReceipt,
    SparkTableSeed,
    SqlSeedError,
    generated_identifier_is_safe,
    spark_scalar_is_valid,
    stable_fingerprint,
)

__all__ = [
    "SparkBatchSeedClient",
    "SparkCleanupReceipt",
    "SparkColumn",
    "SparkColumnType",
    "SparkPartitionRows",
    "SparkSeedPlan",
    "SparkSeedReceipt",
    "SparkTableSeed",
    "SqlSeedError",
]

if TYPE_CHECKING:
    from collections.abc import Callable, Mapping

    from playwright_web_ui.platform_context import PlatformContext

_CATALOGUE_PATH = "/api/rdos/batch/batchCatalogue/getCatalogue"
_DDL_PATH = "/api/rdos/batch/batchTableInfo/ddlCreateTableEncryption"
_SCRIPT_UPSERT_PATH = "/api/rdos/batch/batchScript/addOrUpdateScriptEncryption"
_SQL_RUN_PATH = "/api/rdos/batch/batchScript/startSqlImmediatelyEncryption"
_SQL_STATUS_PATH = "/api/rdos/batch/batchSelectSql/selectStatus"
_SCRIPT_NAME = "__playwright_web_ui_sql_seed__"
_SCRIPT_TEXT = "-- controlled playwright web ui SQL seed"
_SPARK_DATASOURCE_KEY = "sparkthrift"
_SUPPORTED_SPARK_TYPE_IDS = frozenset({45})
_CONTROL_RE = re.compile(r"[\x00-\x1f\x7f]")
_SUCCESS_STATUS = frozenset({5, 12})
_TERMINAL_FAILURE_STATUS = frozenset({7, 8, 9, 13})
_MAX_TREE_NODES = 512
_MAX_CONTEXT_IDENTIFIER_LENGTH = 10_000
_MAX_JOB_ID_LENGTH = 128
_DEFAULT_REQUEST_TIMEOUT_MS = 30_000
_DEFAULT_POLL_TIMEOUT_MS = 600_000
_DEFAULT_POLL_INTERVAL_MS = 2_000
_DEFAULT_INSERT_ATTEMPTS = 5
_DEFAULT_INSERT_RETRY_DELAY_MS = 1_500


@dataclass(frozen=True, slots=True)
class _SeedTarget:
    base_url: str
    project_id: int
    source_id: int
    source_type_id: int
    logical_source_name: str
    batch_source_name: str
    schema: str

    @property
    def binding_fingerprint(self) -> str:
        return stable_fingerprint(
            {
                "project_id": self.project_id,
                "source_id": self.source_id,
                "source_type_id": self.source_type_id,
                "logical_source_name": self.logical_source_name,
                "batch_source_name": self.batch_source_name,
                "schema": self.schema,
            }
        )


@dataclass(frozen=True, slots=True)
class _DropTableStatement:
    table_name: str

    def render(self, target: _SeedTarget) -> str:
        return f"DROP TABLE IF EXISTS {_qualified(target.schema, self.table_name)}"


@dataclass(frozen=True, slots=True)
class _CreateTableStatement:
    table_name: str
    seed: SparkTableSeed

    def render(self, target: _SeedTarget) -> str:
        columns = ",\n".join(
            f"  {_quoted(column.name)} {column.data_type.value}" for column in self.seed.columns
        )
        return "\n".join(
            (
                f"CREATE TABLE {_qualified(target.schema, self.table_name)} (",
                columns,
                ")",
                f"PARTITIONED BY ({_quoted(self.seed.partition_column)} STRING)",
                "STORED AS ORC",
            )
        )


@dataclass(frozen=True, slots=True)
class _InsertPartitionStatement:
    table_name: str
    columns: tuple[SparkColumn, ...]
    partition_column: str
    partition: SparkPartitionRows

    def render(self, target: _SeedTarget) -> str:
        selects: list[str] = []
        for row in self.partition.rows:
            values = ", ".join(
                f"{_sql_scalar(column.data_type, value)} AS {_quoted(column.name)}"
                for column, value in zip(self.columns, row, strict=True)
            )
            selects.append(f"SELECT {values}")
        return "\n".join(
            (
                f"INSERT OVERWRITE TABLE {_qualified(target.schema, self.table_name)}",
                (
                    f"PARTITION ({_quoted(self.partition_column)}="
                    f"{_sql_string(self.partition.value)})"
                ),
                "\nUNION ALL\n".join(selects),
            )
        )


@dataclass(frozen=True, slots=True)
class _TableStatements:
    table_name: str
    drop: _DropTableStatement
    create: _CreateTableStatement
    inserts: tuple[_InsertPartitionStatement, ...]


class _ApiResponse(Protocol):
    @property
    def ok(self) -> bool:
        """Return whether transport accepted the response."""
        ...

    def json(self) -> object:
        """Decode the JSON body."""
        ...


class _ApiRequestContext(Protocol):
    def post(
        self,
        url: str,
        *,
        data: object,
        headers: Mapping[str, str],
        timeout: float,
    ) -> _ApiResponse:
        """Submit one authenticated JSON request."""
        ...


class _BrowserContext(Protocol):
    @property
    def request(self) -> _ApiRequestContext:
        """Return the authenticated Playwright request context."""
        ...


class _Page(Protocol):
    @property
    def context(self) -> _BrowserContext:
        """Return the browser context that owns authentication."""
        ...


@dataclass(slots=True)
class SparkBatchSeedClient:
    """Seed and clean runtime-owned Spark tables through controlled platform APIs."""

    page: _Page
    platform_context: PlatformContext
    request_timeout_ms: int = _DEFAULT_REQUEST_TIMEOUT_MS
    poll_timeout_ms: int = _DEFAULT_POLL_TIMEOUT_MS
    poll_interval_ms: int = _DEFAULT_POLL_INTERVAL_MS
    insert_attempts: int = _DEFAULT_INSERT_ATTEMPTS
    insert_retry_delay_ms: int = _DEFAULT_INSERT_RETRY_DELAY_MS
    monotonic_fn: Callable[[], float] = monotonic
    sleep_fn: Callable[[float], None] = sleep
    _script_id: int | None = field(default=None, init=False, repr=False)

    def setup(self, plan: SparkSeedPlan) -> SparkSeedReceipt:
        """Idempotently replace owned tables with the plan's exact schema and rows."""
        plan.validate()
        target = self._target()
        touched: list[str] = []
        try:
            for statements in _statements(plan):
                touched.append(statements.table_name)
                self._execute_script(statements.drop.render(target), target)
                self._execute_create(statements.create.render(target), target)
                for insert in statements.inserts:
                    self._execute_insert(insert.render(target), target)
        except SqlSeedError:
            self._best_effort_drop(touched, target)
            raise
        return SparkSeedReceipt(
            case_id=plan.case_id,
            table_names=plan.table_names,
            schema_fingerprint=plan.schema_fingerprint,
            data_fingerprint=plan.data_fingerprint,
            binding_fingerprint=target.binding_fingerprint,
        )

    def cleanup(self, plan: SparkSeedPlan) -> SparkCleanupReceipt:
        """Idempotently drop only tables derived from the validated ownership token."""
        plan.validate()
        target = self._target()
        table_names = tuple(reversed(plan.table_names))
        for table_name in table_names:
            self._execute_script(_DropTableStatement(table_name).render(target), target)
        return SparkCleanupReceipt(
            case_id=plan.case_id,
            table_names=table_names,
            binding_fingerprint=target.binding_fingerprint,
        )

    def _target(self) -> _SeedTarget:
        integer_options = (
            self.request_timeout_ms,
            self.poll_timeout_ms,
            self.poll_interval_ms,
            self.insert_attempts,
            self.insert_retry_delay_ms,
        )
        if any(not _is_positive_int(value) for value in integer_options):
            _fail("SQL_SEED_TARGET_INVALID", "seed retry and timeout options must be positive")
        context = self.platform_context
        if not context.safety.allow_write or context.defaults.datasource != _SPARK_DATASOURCE_KEY:
            _fail("SQL_SEED_TARGET_INVALID", "writable canonical Spark datasource is required")
        source = context.datasources.get(_SPARK_DATASOURCE_KEY)
        offline = context.projects.offline
        if (
            source is None
            or not source.requires_offline
            or source.batch is None
            or offline is None
            or not _is_positive_int(offline.id)
            or not _is_positive_int(source.batch.id)
            or not _is_positive_int(source.batch.type_id)
            or source.batch.type_id not in _SUPPORTED_SPARK_TYPE_IDS
            or not _is_trusted_context_identifier(source.schema)
        ):
            _fail("SQL_SEED_TARGET_INVALID", "resolved Spark Batch binding is incomplete")
        return _SeedTarget(
            base_url=context.urls.base_url,
            project_id=offline.id,
            source_id=source.batch.id,
            source_type_id=source.batch.type_id,
            logical_source_name=source.name,
            batch_source_name=source.batch.name,
            schema=source.schema,
        )

    def _execute_create(self, sql: str, target: _SeedTarget) -> None:
        self._post(
            _DDL_PATH,
            {
                "sql": _base64(sql),
                "sourceId": target.source_id,
                "targetSchema": target.schema,
                "syncTask": True,
            },
            target,
            operation="create table",
        )

    def _execute_insert(self, sql: str, target: _SeedTarget) -> None:
        for attempt in range(1, self.insert_attempts + 1):
            try:
                self._execute_script(sql, target)
            except SqlSeedError:
                if attempt == self.insert_attempts:
                    raise
                self.sleep_fn((self.insert_retry_delay_ms * attempt) / 1000)
            else:
                return

    def _execute_script(self, sql: str, target: _SeedTarget) -> None:
        script_id = self._ensure_script(target)
        payload = self._post(
            _SQL_RUN_PATH,
            {
                "scriptId": script_id,
                "sql": _base64(sql),
                "isCheckDDL": 0,
                "taskParams": "",
                "queryLimit": 1000,
                "sourceId": target.source_id,
                "targetSchema": target.schema,
                "syncTask": True,
            },
            target,
            operation="execute SQL",
        )
        data = _optional_record(payload.get("data"), "SQL_SEED_RESPONSE_INVALID")
        job_id = data.get("jobId")
        if job_id is not None:
            if not isinstance(job_id, (str, int)) or isinstance(job_id, bool):
                _fail("SQL_SEED_RESPONSE_INVALID", "SQL job identity is invalid")
            value = str(job_id)
            if (
                not value
                or len(value) > _MAX_JOB_ID_LENGTH
                or _CONTROL_RE.search(value) is not None
            ):
                _fail("SQL_SEED_RESPONSE_INVALID", "SQL job identity is invalid")
            self._poll_job(value, target)
            return
        status = data.get("status")
        if status is None and not data.get("msg"):
            return
        if _status(status) in _SUCCESS_STATUS:
            return
        _fail("SQL_SEED_JOB_FAILED", "SQL execution did not reach a successful terminal state")

    def _poll_job(self, job_id: str, target: _SeedTarget) -> None:
        deadline = self.monotonic_fn() + (self.poll_timeout_ms / 1000)
        while self.monotonic_fn() < deadline:
            payload = self._post(
                _SQL_STATUS_PATH,
                {"jobId": job_id, "type": 0},
                target,
                operation="poll SQL job",
            )
            data = _optional_record(payload.get("data"), "SQL_SEED_RESPONSE_INVALID")
            status = _status(data.get("status"))
            if status in _SUCCESS_STATUS:
                return
            if status in _TERMINAL_FAILURE_STATUS:
                _fail("SQL_SEED_JOB_FAILED", "SQL job reached a failed terminal state")
            self.sleep_fn(self.poll_interval_ms / 1000)
        _fail("SQL_SEED_JOB_TIMEOUT", "SQL job did not finish within the configured timeout")

    def _ensure_script(self, target: _SeedTarget) -> int:
        if self._script_id is not None:
            return self._script_id
        catalogue = self._post(
            _CATALOGUE_PATH,
            {"catalogueType": 0, "isGetFile": 0, "nodePid": 0},
            target,
            operation="resolve script catalogue",
        )
        folder_id = _script_folder_id(catalogue.get("data"))
        existing = self._query_script(folder_id, target)
        if existing is not None:
            self._script_id = existing
            return existing
        try:
            created = self._post(
                _SCRIPT_UPSERT_PATH,
                {
                    "name": _SCRIPT_NAME,
                    "scriptText": _base64(_SCRIPT_TEXT),
                    "type": 0,
                    "appType": 1,
                    "nodePid": folder_id,
                    "taskParams": "",
                    "lockVersion": 0,
                    "forceUpdate": False,
                    "isDeleted": 0,
                    "id": 0,
                },
                target,
                operation="create seed script",
            )
        except SqlSeedError as create_error:
            if create_error.code != "SQL_SEED_API_REJECTED":
                raise
            try:
                winner = self._query_script(folder_id, target)
            except SqlSeedError:
                raise create_error from None
            if winner is None:
                raise create_error from None
            self._script_id = winner
            return winner
        script_id = _positive_int(
            _optional_record(created.get("data"), "SQL_SEED_RESPONSE_INVALID").get("id"),
            "SQL_SEED_RESPONSE_INVALID",
        )
        self._script_id = script_id
        return script_id

    def _query_script(self, folder_id: int, target: _SeedTarget) -> int | None:
        files = self._post(
            _CATALOGUE_PATH,
            {"catalogueType": "ScriptManager", "isGetFile": 1, "nodePid": folder_id},
            target,
            operation="resolve seed script",
        )
        return _named_script_id(files.get("data"))

    def _best_effort_drop(self, table_names: list[str], target: _SeedTarget) -> None:
        for table_name in reversed(table_names):
            try:
                self._execute_script(_DropTableStatement(table_name).render(target), target)
            except SqlSeedError:
                continue

    def _post(
        self,
        path: str,
        data: Mapping[str, object],
        target: _SeedTarget,
        *,
        operation: str,
    ) -> dict[str, object]:
        try:
            response = self.page.context.request.post(
                f"{target.base_url}{path}",
                data=dict(data),
                headers={"X-Project-Id": str(target.project_id)},
                timeout=float(self.request_timeout_ms),
            )
            response_ok = response.ok
        except Exception:  # noqa: BLE001 - 第三方传输异常必须在信任边界统一脱敏。
            _redacted_fail("SQL_SEED_HTTP_ERROR", f"{operation} request failed")
        if not response_ok:
            _fail("SQL_SEED_HTTP_ERROR", f"{operation} request failed")
        try:
            payload = response.json()
        except Exception:  # noqa: BLE001 - 第三方响应异常必须在信任边界统一脱敏。
            _redacted_fail(
                "SQL_SEED_RESPONSE_INVALID",
                f"{operation} response is not valid JSON",
            )
        if not isinstance(payload, dict):
            _fail("SQL_SEED_RESPONSE_INVALID", f"{operation} response envelope is invalid")
        record = cast("dict[object, object]", payload)
        code = record.get("code")
        if isinstance(code, bool) or not isinstance(code, int):
            _fail("SQL_SEED_RESPONSE_INVALID", f"{operation} response code is invalid")
        if code != 1:
            _fail("SQL_SEED_API_REJECTED", f"{operation} was rejected by the platform")
        return {str(key): value for key, value in record.items()}


def _statements(plan: SparkSeedPlan) -> tuple[_TableStatements, ...]:
    return tuple(
        _TableStatements(
            table_name=table_name,
            drop=_DropTableStatement(table_name),
            create=_CreateTableStatement(table_name, seed),
            inserts=tuple(
                _InsertPartitionStatement(
                    table_name=table_name,
                    columns=seed.columns,
                    partition_column=seed.partition_column,
                    partition=partition,
                )
                for partition in seed.partitions
            ),
        )
        for table_name, seed in zip(plan.table_names, plan.table_seeds, strict=True)
    )


def _script_folder_id(value: object) -> int:
    nodes = _tree_nodes(value)
    exact = [
        node for node in nodes if node.get("name") == "临时查询" and node.get("type") == "folder"
    ]
    if len(exact) == 1:
        return _positive_int(exact[0].get("id"), "SQL_SEED_RESPONSE_INVALID")
    if len(exact) > 1:
        _fail("SQL_SEED_RESPONSE_INVALID", "script catalogue identity is ambiguous")
    leaves = [
        node
        for node in nodes
        if node.get("catalogueType") == "ScriptManager"
        and node.get("type") == "folder"
        and not any(child.get("type") == "folder" for child in _children(node))
    ]
    if len(leaves) != 1:
        _fail("SQL_SEED_RESPONSE_INVALID", "script catalogue identity is ambiguous")
    return _positive_int(leaves[0].get("id"), "SQL_SEED_RESPONSE_INVALID")


def _named_script_id(value: object) -> int | None:
    matches = [
        node
        for node in _tree_nodes(value)
        if node.get("name") == _SCRIPT_NAME and node.get("type") == "file"
    ]
    if len(matches) > 1:
        _fail("SQL_SEED_RESPONSE_INVALID", "seed script identity is ambiguous")
    return _positive_int(matches[0].get("id"), "SQL_SEED_RESPONSE_INVALID") if matches else None


def _tree_nodes(value: object) -> tuple[dict[str, object], ...]:
    root = _optional_record(value, "SQL_SEED_RESPONSE_INVALID")
    pending = [root]
    result: list[dict[str, object]] = []
    while pending:
        node = pending.pop()
        result.append(node)
        if len(result) > _MAX_TREE_NODES:
            _fail("SQL_SEED_RESPONSE_INVALID", "catalogue tree exceeds the safe node limit")
        pending.extend(reversed(_children(node)))
    return tuple(result)


def _children(node: Mapping[str, object]) -> tuple[dict[str, object], ...]:
    value = node.get("children", [])
    if not isinstance(value, list):
        _fail("SQL_SEED_RESPONSE_INVALID", "catalogue children must be an array")
    children: list[dict[str, object]] = []
    for item in cast("list[object]", value):
        if not isinstance(item, dict):
            _fail("SQL_SEED_RESPONSE_INVALID", "catalogue child must be an object")
        record = cast("dict[object, object]", item)
        children.append({str(key): child_value for key, child_value in record.items()})
    return tuple(children)


def _optional_record(value: object, code: str) -> dict[str, object]:
    if not isinstance(value, dict):
        _fail(code, "platform response data must be an object")
    record = cast("dict[object, object]", value)
    return {str(key): item for key, item in record.items()}


def _positive_int(value: object, code: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value < 1:
        _fail(code, "platform identity must be a positive integer")
    return value


def _is_positive_int(value: object) -> bool:
    return isinstance(value, int) and not isinstance(value, bool) and value > 0


def _status(value: object) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        _fail("SQL_SEED_RESPONSE_INVALID", "SQL job status is invalid")
    return value


def _sql_scalar(data_type: SparkColumnType, value: object) -> str:
    if not spark_scalar_is_valid(data_type, value):
        _fail("SQL_SEED_PLAN_INVALID", "row value cannot be rendered for its Spark type")
    if value is None:
        return "NULL"
    if data_type in {SparkColumnType.INT, SparkColumnType.BIGINT}:
        return str(value)
    if data_type is SparkColumnType.STRING:
        return _sql_string(str(value))
    if data_type is SparkColumnType.DATE and type(value) is date:
        return f"CAST({_sql_string(value.isoformat())} AS DATE)"
    return _fail("SQL_SEED_PLAN_INVALID", "row value cannot be rendered for its Spark type")


def _sql_string(value: str) -> str:
    escaped = value.replace("'", "''")
    return f"'{escaped}'"


def _qualified(schema: str, table_name: str) -> str:
    if not _is_trusted_context_identifier(schema) or not generated_identifier_is_safe(table_name):
        _fail("SQL_SEED_TARGET_INVALID", "qualified table identity is unsafe")
    return f"{_quoted(schema)}.{_quoted(table_name)}"


def _is_trusted_context_identifier(value: object) -> bool:
    return (
        isinstance(value, str)
        and bool(value)
        and value == value.strip()
        and len(value) <= _MAX_CONTEXT_IDENTIFIER_LENGTH
        and "`" not in value
        and _CONTROL_RE.search(value) is None
    )


def _quoted(identifier: str) -> str:
    return f"`{identifier}`"


def _base64(value: str) -> str:
    return base64.b64encode(value.encode("utf-8")).decode("ascii")


def _fail(code: str, detail: str) -> Never:
    raise SqlSeedError(code, detail)


def _redacted_fail(code: str, detail: str) -> Never:
    raise SqlSeedError(code, detail) from None
