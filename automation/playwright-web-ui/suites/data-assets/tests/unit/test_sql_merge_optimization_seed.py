from __future__ import annotations

import base64
from dataclasses import dataclass, replace
from datetime import date
from time import monotonic, sleep
from types import MappingProxyType
from typing import TYPE_CHECKING, cast

import pytest

from data_assets_playwright_web_ui.domains.data_quality.sql_merge_optimization.sql_seed import (
    SparkBatchSeedClient,
    SparkColumn,
    SparkColumnType,
    SparkPartitionRows,
    SparkSeedPlan,
    SparkTableSeed,
    SqlSeedError,
)
from playwright_web_ui.platform_context import (
    DataSourceEndpoint,
    PlatformContext,
    PlatformDataSource,
    PlatformDefaults,
    PlatformProject,
    PlatformProjects,
    PlatformSafety,
    PlatformTenant,
    PlatformUrls,
)

if TYPE_CHECKING:
    from collections.abc import Callable, Mapping


_CATALOGUE_PATH = "/api/rdos/batch/batchCatalogue/getCatalogue"
_SCRIPT_UPSERT_PATH = "/api/rdos/batch/batchScript/addOrUpdateScriptEncryption"
_SQL_RUN_PATH = "/api/rdos/batch/batchScript/startSqlImmediatelyEncryption"
_SQL_STATUS_PATH = "/api/rdos/batch/batchSelectSql/selectStatus"
_DDL_PATH = "/api/rdos/batch/batchTableInfo/ddlCreateTableEncryption"
_SCRIPT_NAME = "__playwright_web_ui_sql_seed__"
_SCRIPT_TEXT = "-- controlled playwright web ui SQL seed"
_OWNERSHIP_IDENTITY = "a0123456789"
_INVALID_OWNERSHIP_IDENTITY = "unsafe"
_TABLE_NAME = "test_table_15862_c0001_a0123456789"
_HASH_LENGTH = 64
_ROWS_PER_PARTITION = 6
_RACE_SCRIPT_ID = 91
_CATALOGUE_QUERY_COUNT = 2
_MAX_INSERT_ATTEMPTS = 5
_TEMP_SCRIPT_FOLDER_ID = 55
_UNSUPPORTED_SPARK_TYPE_ID = 46
_UNEXPECTED_REQUEST = "unexpected request"


@dataclass(frozen=True, slots=True)
class RequestCall:
    url: str
    data: dict[str, object]
    headers: Mapping[str, str]
    timeout: float


@dataclass(frozen=True, slots=True)
class FakeResponse:
    payload: object
    ok: bool = True

    def json(self) -> object:
        if isinstance(self.payload, Exception):
            raise self.payload
        return self.payload


class FakeRequest:
    def __init__(self, responses: list[FakeResponse]) -> None:
        self.responses = responses
        self.calls: list[RequestCall] = []

    def post(
        self,
        url: str,
        *,
        data: object,
        headers: Mapping[str, str],
        timeout: float,
    ) -> FakeResponse:
        assert isinstance(data, dict)
        record = cast("dict[object, object]", data)
        normalized: dict[str, object] = {str(key): value for key, value in record.items()}
        self.calls.append(RequestCall(url=url, data=normalized, headers=headers, timeout=timeout))
        if not self.responses:
            raise AssertionError(_UNEXPECTED_REQUEST)
        return self.responses.pop(0)


@dataclass(frozen=True, slots=True)
class FakeBrowserContext:
    request: FakeRequest


@dataclass(frozen=True, slots=True)
class FakePage:
    context: FakeBrowserContext


@dataclass(frozen=True, slots=True)
class PlatformContextOptions:
    allow_write: bool = True
    default_datasource: str = "sparkthrift"
    include_offline: bool = True
    include_batch: bool = True
    requires_offline: bool = True
    batch_id: int = 701
    batch_name: str = "Spark Warehouse"
    batch_type_id: int = 45
    schema: str = "quality_schema"


def platform_context(options: PlatformContextOptions | None = None) -> PlatformContext:
    resolved = options or PlatformContextOptions()
    source = PlatformDataSource(
        name="Spark Warehouse",
        batch=(
            DataSourceEndpoint(
                id=resolved.batch_id,
                name=resolved.batch_name,
                type_id=resolved.batch_type_id,
            )
            if resolved.include_batch
            else None
        ),
        metadata=DataSourceEndpoint(id=702, name="Spark Warehouse", type_id=45),
        assets=DataSourceEndpoint(id=703, name="Spark Warehouse", type_id=45),
        database="quality_db",
        schema=resolved.schema,
        requires_offline=resolved.requires_offline,
    )
    sources = {"sparkthrift": source}
    if resolved.default_datasource != "sparkthrift":
        sources[resolved.default_datasource] = replace(source, name="Another Source")
    return PlatformContext(
        schema_version=2,
        env="test-env",
        urls=PlatformUrls(
            base_url="https://platform.example",
            assets_base_url="https://platform.example/dataAssets",
            offline_base_url="https://platform.example/batch",
            portal_base_url="https://platform.example/portal",
        ),
        tenant=PlatformTenant(name="tenant-a", id=1, user_id=2, username="tester"),
        projects=PlatformProjects(
            quality=PlatformProject(id=301, name="quality-project"),
            offline=(
                PlatformProject(id=401, name="offline-project")
                if resolved.include_offline
                else None
            ),
        ),
        datasources=MappingProxyType(sources),
        defaults=PlatformDefaults(datasource=resolved.default_datasource),
        safety=PlatformSafety(allow_write=resolved.allow_write),
        warnings=(),
        serialized="{}",
    )


def partition_rows(value: str, *, offset: int = 0) -> SparkPartitionRows:
    return SparkPartitionRows(
        value=value,
        rows=(
            (offset + 1, "O'Brien", date(2026, 7, 1)),
            (offset + 2, None, date(2026, 7, 2)),
            (offset + 3, "Alice", date(2026, 7, 3)),
            (offset + 4, "Bob", date(2026, 7, 4)),
            (offset + 5, "Carol", date(2026, 7, 5)),
            (offset + 6, "Dave", date(2026, 7, 6)),
        ),
    )


def table_seed(
    *,
    partitions: tuple[SparkPartitionRows, ...] | None = None,
) -> SparkTableSeed:
    return SparkTableSeed(
        columns=(
            SparkColumn("id", SparkColumnType.INT),
            SparkColumn("name", SparkColumnType.STRING),
            SparkColumn("buy_date", SparkColumnType.DATE),
        ),
        partition_column="dt",
        partitions=(
            partition_rows("2026-08-04"),
            partition_rows("2026-08-05", offset=6),
        )
        if partitions is None
        else partitions,
    )


def seed_plan(*, compare: bool = False) -> SparkSeedPlan:
    return SparkSeedPlan(
        case_id="C0001",
        ownership_token=_OWNERSHIP_IDENTITY,
        main=table_seed(),
        compare=table_seed() if compare else None,
    )


def catalogue_folder(*, include_catalogue_type: bool = True) -> FakeResponse:
    temporary_folder: dict[str, object] = {
        "id": 55,
        "name": "临时查询",
        "type": "folder",
        "children": [],
    }
    if include_catalogue_type:
        temporary_folder["catalogueType"] = "ScriptManager"
    payload: dict[str, object] = {
        "code": 1,
        "data": {
            "id": 1,
            "name": "root",
            "type": "folder",
            "children": [temporary_folder],
        },
    }
    return FakeResponse(payload)


def catalogue_with_multiple_script_folders() -> FakeResponse:
    payload: dict[str, object] = {
        "code": 1,
        "data": {
            "id": 1,
            "name": "root",
            "type": "folder",
            "children": [
                {
                    "id": 55,
                    "name": "临时查询",
                    "type": "folder",
                    "catalogueType": "ScriptManager",
                    "children": [],
                },
                {
                    "id": 56,
                    "name": "shared scripts",
                    "type": "folder",
                    "catalogueType": "ScriptManager",
                    "children": [],
                },
            ],
        },
    }
    return FakeResponse(payload)


def script_listing(*, script_id: int | None = 81) -> FakeResponse:
    children: list[dict[str, object]] = []
    if script_id is not None:
        children.append({"id": script_id, "name": _SCRIPT_NAME, "type": "file"})
    return FakeResponse({"code": 1, "data": {"id": 55, "children": children}})


def sync_sql_success() -> FakeResponse:
    return FakeResponse({"code": 1, "data": {}})


def ddl_success() -> FakeResponse:
    return FakeResponse({"code": 1, "data": True})


def api_rejected() -> FakeResponse:
    return FakeResponse({"code": 0, "message": "secret platform detail"})


def job_started(job_id: str) -> FakeResponse:
    return FakeResponse({"code": 1, "data": {"jobId": job_id}})


def job_status(status: int) -> FakeResponse:
    return FakeResponse({"code": 1, "data": {"status": status}})


@dataclass(frozen=True, slots=True)
class ClientOptions:
    context: PlatformContext | None = None
    monotonic_fn: Callable[[], float] | None = None
    sleep_fn: Callable[[float], None] | None = None
    poll_timeout_ms: int = 10_000
    insert_attempts: int = 1
    insert_retry_delay_ms: int = 1


def client_with(
    responses: list[FakeResponse],
    options: ClientOptions | None = None,
) -> tuple[SparkBatchSeedClient, FakeRequest]:
    resolved = options or ClientOptions()
    request = FakeRequest(responses)
    page = FakePage(FakeBrowserContext(request))
    client = SparkBatchSeedClient(
        page=page,
        platform_context=resolved.context or platform_context(),
        poll_timeout_ms=resolved.poll_timeout_ms,
        poll_interval_ms=1,
        insert_attempts=resolved.insert_attempts,
        insert_retry_delay_ms=resolved.insert_retry_delay_ms,
        monotonic_fn=resolved.monotonic_fn or monotonic,
        sleep_fn=resolved.sleep_fn or sleep,
    )
    return client, request


def request_path(call: RequestCall) -> str:
    return call.url.removeprefix("https://platform.example")


def decoded_sql(call: RequestCall) -> str:
    encoded = call.data["sql"]
    assert isinstance(encoded, str)
    return base64.b64decode(encoded).decode("utf-8")


def test_setup_binds_exact_context_and_seeds_both_canonical_partitions() -> None:
    client, request = client_with(
        [
            catalogue_folder(),
            script_listing(),
            job_started("drop-job"),
            job_status(4),
            job_status(5),
            ddl_success(),
            job_started("insert-job"),
            job_status(12),
            sync_sql_success(),
        ],
        ClientOptions(sleep_fn=lambda _seconds: None),
    )

    receipt = client.setup(seed_plan())

    assert receipt.case_id == "C0001"
    assert receipt.table_names == (_TABLE_NAME,)
    assert len(receipt.schema_fingerprint) == _HASH_LENGTH
    assert len(receipt.data_fingerprint) == _HASH_LENGTH
    assert [request_path(call) for call in request.calls] == [
        _CATALOGUE_PATH,
        _CATALOGUE_PATH,
        _SQL_RUN_PATH,
        _SQL_STATUS_PATH,
        _SQL_STATUS_PATH,
        _DDL_PATH,
        _SQL_RUN_PATH,
        _SQL_STATUS_PATH,
        _SQL_RUN_PATH,
    ]
    assert all(call.headers == {"X-Project-Id": "401"} for call in request.calls)
    assert request.calls[0].data == {"catalogueType": 0, "isGetFile": 0, "nodePid": 0}
    assert request.calls[1].data == {
        "catalogueType": "ScriptManager",
        "isGetFile": 1,
        "nodePid": 55,
    }
    drop_call, create_call = request.calls[2], request.calls[5]
    first_insert, second_insert = request.calls[6], request.calls[8]
    assert drop_call.data == {
        "scriptId": 81,
        "sql": drop_call.data["sql"],
        "isCheckDDL": 0,
        "taskParams": "",
        "queryLimit": 1000,
        "sourceId": 701,
        "targetSchema": "quality_schema",
        "syncTask": True,
    }
    assert create_call.data == {
        "sql": create_call.data["sql"],
        "sourceId": 701,
        "targetSchema": "quality_schema",
        "syncTask": True,
    }
    assert first_insert.data == {
        "scriptId": 81,
        "sql": first_insert.data["sql"],
        "isCheckDDL": 0,
        "taskParams": "",
        "queryLimit": 1000,
        "sourceId": 701,
        "targetSchema": "quality_schema",
        "syncTask": True,
    }
    assert second_insert.data == {**first_insert.data, "sql": second_insert.data["sql"]}
    assert decoded_sql(drop_call) == (
        "DROP TABLE IF EXISTS `quality_schema`.`test_table_15862_c0001_a0123456789`"
    )
    assert (
        decoded_sql(create_call)
        == """CREATE TABLE `quality_schema`.`test_table_15862_c0001_a0123456789` (
  `id` INT,
  `name` STRING,
  `buy_date` DATE
)
PARTITIONED BY (`dt` STRING)
STORED AS ORC"""
    )
    assert (
        decoded_sql(first_insert)
        == """INSERT OVERWRITE TABLE `quality_schema`.`test_table_15862_c0001_a0123456789`
PARTITION (`dt`='2026-08-04')
SELECT 1 AS `id`, 'O''Brien' AS `name`, CAST('2026-07-01' AS DATE) AS `buy_date`
UNION ALL
SELECT 2 AS `id`, NULL AS `name`, CAST('2026-07-02' AS DATE) AS `buy_date`
UNION ALL
SELECT 3 AS `id`, 'Alice' AS `name`, CAST('2026-07-03' AS DATE) AS `buy_date`
UNION ALL
SELECT 4 AS `id`, 'Bob' AS `name`, CAST('2026-07-04' AS DATE) AS `buy_date`
UNION ALL
SELECT 5 AS `id`, 'Carol' AS `name`, CAST('2026-07-05' AS DATE) AS `buy_date`
UNION ALL
SELECT 6 AS `id`, 'Dave' AS `name`, CAST('2026-07-06' AS DATE) AS `buy_date`"""
    )
    assert decoded_sql(second_insert).startswith(
        "INSERT OVERWRITE TABLE `quality_schema`.`test_table_15862_c0001_a0123456789`\n"
        "PARTITION (`dt`='2026-08-05')\n"
    )
    assert decoded_sql(second_insert).count("SELECT ") == _ROWS_PER_PARTITION


def test_setup_creates_one_reusable_executor_scoped_script_with_exact_body() -> None:
    client, request = client_with(
        [
            catalogue_folder(),
            script_listing(script_id=None),
            FakeResponse({"code": 1, "data": {"id": 82}}),
            sync_sql_success(),
            ddl_success(),
            sync_sql_success(),
            sync_sql_success(),
        ]
    )

    client.setup(seed_plan())

    assert request_path(request.calls[2]) == _SCRIPT_UPSERT_PATH
    assert request.calls[2].data == {
        "name": _SCRIPT_NAME,
        "scriptText": base64.b64encode(_SCRIPT_TEXT.encode()).decode("ascii"),
        "type": 0,
        "appType": 1,
        "nodePid": 55,
        "taskParams": "",
        "lockVersion": 0,
        "forceUpdate": False,
        "isDeleted": 0,
        "id": 0,
    }


def test_script_create_race_requeries_and_reuses_unique_winner() -> None:
    client, request = client_with(
        [
            catalogue_folder(),
            script_listing(script_id=None),
            api_rejected(),
            script_listing(script_id=_RACE_SCRIPT_ID),
            sync_sql_success(),
            ddl_success(),
            sync_sql_success(),
            sync_sql_success(),
        ]
    )

    client.setup(seed_plan())

    assert [request_path(call) for call in request.calls[:4]] == [
        _CATALOGUE_PATH,
        _CATALOGUE_PATH,
        _SCRIPT_UPSERT_PATH,
        _CATALOGUE_PATH,
    ]
    assert request.calls[4].data["scriptId"] == _RACE_SCRIPT_ID


def test_exact_temporary_script_folder_wins_when_catalogue_has_multiple_leaves() -> None:
    client, request = client_with(
        [catalogue_with_multiple_script_folders(), script_listing(), sync_sql_success()]
    )

    client.cleanup(seed_plan())

    assert request.calls[1].data == {
        "catalogueType": "ScriptManager",
        "isGetFile": 1,
        "nodePid": 55,
    }


def test_legacy_temporary_folder_without_catalogue_type_remains_supported() -> None:
    client, request = client_with(
        [
            catalogue_folder(include_catalogue_type=False),
            script_listing(),
            sync_sql_success(),
        ]
    )

    client.cleanup(seed_plan())

    assert request.calls[1].data["nodePid"] == _TEMP_SCRIPT_FOLDER_ID


def test_setup_is_idempotent_and_reuses_script_identity() -> None:
    responses = [
        catalogue_folder(),
        script_listing(),
        sync_sql_success(),
        ddl_success(),
        sync_sql_success(),
        sync_sql_success(),
        sync_sql_success(),
        ddl_success(),
        sync_sql_success(),
        sync_sql_success(),
    ]
    client, request = client_with(responses)
    plan = seed_plan()

    first = client.setup(plan)
    second = client.setup(plan)

    assert first == second
    assert [request_path(call) for call in request.calls].count(
        _CATALOGUE_PATH
    ) == _CATALOGUE_QUERY_COUNT
    statements = [
        decoded_sql(call).split(maxsplit=1)[0] for call in request.calls if "sql" in call.data
    ]
    assert statements == [
        "DROP",
        "CREATE",
        "INSERT",
        "INSERT",
        "DROP",
        "CREATE",
        "INSERT",
        "INSERT",
    ]


def test_cleanup_drops_only_owned_tables_in_reverse_order_and_is_idempotent() -> None:
    client, request = client_with(
        [
            catalogue_folder(),
            script_listing(),
            sync_sql_success(),
            sync_sql_success(),
            sync_sql_success(),
            sync_sql_success(),
        ]
    )
    plan = seed_plan(compare=True)

    first = client.cleanup(plan)
    second = client.cleanup(plan)

    assert first == second
    assert first.table_names == (f"{_TABLE_NAME}_cmp", _TABLE_NAME)
    drops = [decoded_sql(call) for call in request.calls if request_path(call) == _SQL_RUN_PATH]
    assert drops == [
        f"DROP TABLE IF EXISTS `quality_schema`.`{_TABLE_NAME}_cmp`",
        f"DROP TABLE IF EXISTS `quality_schema`.`{_TABLE_NAME}`",
        f"DROP TABLE IF EXISTS `quality_schema`.`{_TABLE_NAME}_cmp`",
        f"DROP TABLE IF EXISTS `quality_schema`.`{_TABLE_NAME}`",
    ]


@pytest.mark.parametrize(
    "context",
    [
        platform_context(PlatformContextOptions(allow_write=False)),
        platform_context(PlatformContextOptions(default_datasource="other")),
        platform_context(PlatformContextOptions(include_offline=False)),
        platform_context(PlatformContextOptions(include_batch=False)),
        platform_context(PlatformContextOptions(requires_offline=False)),
        platform_context(PlatformContextOptions(batch_id=0)),
        platform_context(PlatformContextOptions(batch_type_id=0)),
        platform_context(PlatformContextOptions(batch_type_id=_UNSUPPORTED_SPARK_TYPE_ID)),
        platform_context(PlatformContextOptions(schema="unsafe`schema")),
    ],
)
def test_client_rejects_noncanonical_or_nonwritable_platform_binding(
    context: PlatformContext,
) -> None:
    client, request = client_with([], ClientOptions(context=context))

    with pytest.raises(SqlSeedError, match="SQL_SEED_TARGET_INVALID"):
        client.setup(seed_plan())

    assert request.calls == []


def test_target_accepts_distinct_batch_name_and_quoted_unicode_schema() -> None:
    context = platform_context(
        PlatformContextOptions(batch_name="Spark Batch Endpoint", schema="质量-schema")
    )
    client, request = client_with(
        [catalogue_folder(), script_listing(), sync_sql_success()],
        ClientOptions(context=context),
    )

    receipt = client.cleanup(seed_plan())

    assert len(receipt.binding_fingerprint) == _HASH_LENGTH
    assert decoded_sql(request.calls[-1]) == (f"DROP TABLE IF EXISTS `质量-schema`.`{_TABLE_NAME}`")


def test_insert_overwrite_retries_with_bounded_linear_backoff_then_succeeds() -> None:
    delays: list[float] = []
    client, request = client_with(
        [
            catalogue_folder(),
            script_listing(),
            sync_sql_success(),
            ddl_success(),
            api_rejected(),
            api_rejected(),
            api_rejected(),
            api_rejected(),
            sync_sql_success(),
            sync_sql_success(),
        ],
        ClientOptions(
            insert_attempts=_MAX_INSERT_ATTEMPTS,
            insert_retry_delay_ms=1500,
            sleep_fn=delays.append,
        ),
    )

    client.setup(seed_plan())

    first_partition_attempts = [
        decoded_sql(call)
        for call in request.calls
        if request_path(call) == _SQL_RUN_PATH
        and decoded_sql(call).startswith("INSERT OVERWRITE")
        and "2026-08-04" in decoded_sql(call)
    ]
    assert len(first_partition_attempts) == _MAX_INSERT_ATTEMPTS
    assert delays == [1.5, 3.0, 4.5, 6.0]


def test_exhausted_insert_retry_rolls_back_and_preserves_original_error() -> None:
    delays: list[float] = []
    client, request = client_with(
        [
            catalogue_folder(),
            script_listing(),
            sync_sql_success(),
            ddl_success(),
            api_rejected(),
            api_rejected(),
            api_rejected(),
            api_rejected(),
            api_rejected(),
            api_rejected(),
        ],
        ClientOptions(
            insert_attempts=_MAX_INSERT_ATTEMPTS,
            insert_retry_delay_ms=1500,
            sleep_fn=delays.append,
        ),
    )

    with pytest.raises(SqlSeedError, match="SQL_SEED_API_REJECTED") as raised:
        client.setup(seed_plan())

    assert raised.value.code == "SQL_SEED_API_REJECTED"
    inserts = [
        call
        for call in request.calls
        if request_path(call) == _SQL_RUN_PATH and decoded_sql(call).startswith("INSERT OVERWRITE")
    ]
    assert len(inserts) == _MAX_INSERT_ATTEMPTS
    assert decoded_sql(request.calls[-1]).startswith("DROP TABLE IF EXISTS")
    assert delays == [1.5, 3.0, 4.5, 6.0]


def test_create_failure_best_effort_rolls_back_without_masking_original_error() -> None:
    client, request = client_with(
        [
            catalogue_folder(),
            script_listing(),
            sync_sql_success(),
            api_rejected(),
            api_rejected(),
        ]
    )

    with pytest.raises(SqlSeedError, match="SQL_SEED_API_REJECTED") as raised:
        client.setup(seed_plan())

    assert raised.value.code == "SQL_SEED_API_REJECTED"
    assert [decoded_sql(call) for call in request.calls if request_path(call) == _SQL_RUN_PATH] == [
        f"DROP TABLE IF EXISTS `quality_schema`.`{_TABLE_NAME}`",
        f"DROP TABLE IF EXISTS `quality_schema`.`{_TABLE_NAME}`",
    ]


def test_poll_timeout_is_bounded_and_error_does_not_expose_response_material() -> None:
    ticks = iter((0.0, 0.0, 0.002))
    client, _request = client_with(
        [
            catalogue_folder(),
            script_listing(),
            job_started("secret-job-id"),
            FakeResponse({"code": 1, "data": {"status": 4, "message": "secret-cookie-value"}}),
        ],
        ClientOptions(
            monotonic_fn=lambda: next(ticks),
            sleep_fn=lambda _seconds: None,
            poll_timeout_ms=1,
        ),
    )

    with pytest.raises(SqlSeedError, match="SQL_SEED_JOB_TIMEOUT") as raised:
        client.setup(seed_plan())

    message = str(raised.value)
    assert "secret-job-id" not in message
    assert "secret-cookie-value" not in message


@pytest.mark.parametrize(
    "response",
    [
        FakeResponse({"code": 0, "message": "secret-cookie-value"}),
        FakeResponse(ValueError("secret-json-value")),
        FakeResponse({"code": 1, "data": {}}, ok=False),
    ],
)
def test_transport_and_contract_errors_are_secret_safe(response: FakeResponse) -> None:
    client, _request = client_with([response])

    with pytest.raises(SqlSeedError) as raised:
        client.setup(seed_plan())

    message = str(raised.value)
    assert "secret-cookie-value" not in message
    assert "secret-json-value" not in message
    assert "platform.example" not in message
