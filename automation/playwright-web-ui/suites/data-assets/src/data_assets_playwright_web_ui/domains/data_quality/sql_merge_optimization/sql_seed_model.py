"""Typed canonical Spark seed plans and secret-free content fingerprints."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from datetime import date
from enum import StrEnum
from hashlib import sha256
from typing import Never

_GENERATED_IDENTIFIER_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]{0,127}$")
_CASE_ID_RE = re.compile(r"^C00(?:0[1-9]|[1-6][0-9]|7[0-2])$")
_OWNERSHIP_TOKEN_RE = re.compile(r"^a[0-9a-f]{10}$")
_PARTITION_VALUE_RE = re.compile(r"^[0-9]{4}-[0-9]{2}-[0-9]{2}$")
_CONTROL_RE = re.compile(r"[\x00-\x1f\x7f]")
_CANONICAL_PARTITION_VALUES = ("2026-08-04", "2026-08-05")
_CANONICAL_ROWS_PER_PARTITION = 6
_MAX_STRING_LENGTH = 10_000

type SparkScalar = str | int | date | None


class SqlSeedError(RuntimeError):
    """Represent a stable seed failure without response, SQL, URL, or credential material."""

    def __init__(self, code: str, detail: str) -> None:
        """Initialize a symbolic error code and bounded safe detail."""
        self.code = code
        self.detail = detail
        super().__init__(f"{code}: {detail}")


class SparkColumnType(StrEnum):
    """Supported scalar types for the controlled SQL merge fixture."""

    INT = "INT"
    BIGINT = "BIGINT"
    STRING = "STRING"
    DATE = "DATE"


@dataclass(frozen=True, slots=True)
class SparkColumn:
    """One safe non-partition Spark column."""

    name: str
    data_type: SparkColumnType

    def validate(self) -> None:
        """Reject unsafe generated identifiers and unsupported runtime enum values."""
        if not generated_identifier_is_safe(self.name) or not _column_type_is_supported(
            self.data_type
        ):
            _fail("SQL_SEED_PLAN_INVALID", "column definition is invalid")


@dataclass(frozen=True, slots=True)
class SparkPartitionRows:
    """One canonical static partition and its exact six-row payload."""

    value: str
    rows: tuple[tuple[object, ...], ...]

    def validate(self, columns: tuple[SparkColumn, ...]) -> None:
        """Require one real ISO date and six type-correct rectangular rows."""
        if _PARTITION_VALUE_RE.fullmatch(self.value) is None:
            _fail("SQL_SEED_PLAN_INVALID", "partition value is invalid")
        try:
            date.fromisoformat(self.value)
        except ValueError:
            _fail("SQL_SEED_PLAN_INVALID", "partition date is invalid")
        if len(self.rows) != _CANONICAL_ROWS_PER_PARTITION:
            _fail("SQL_SEED_PLAN_INVALID", "partition must contain six canonical rows")
        for row in self.rows:
            if len(row) != len(columns):
                _fail("SQL_SEED_PLAN_INVALID", "row width must match table columns")
            for column, value in zip(columns, row, strict=True):
                if not spark_scalar_is_valid(column.data_type, value):
                    _fail(
                        "SQL_SEED_PLAN_INVALID",
                        "row value does not match its declared Spark type",
                    )


@dataclass(frozen=True, slots=True)
class SparkTableSeed:
    """A complete canonical schema and deterministic two-partition row set."""

    columns: tuple[SparkColumn, ...]
    partition_column: str
    partitions: tuple[SparkPartitionRows, ...]

    def validate(self) -> None:
        """Require an unambiguous schema and the two canonical partition batches."""
        if not self.columns:
            _fail("SQL_SEED_PLAN_INVALID", "table schema must be non-empty")
        for column in self.columns:
            column.validate()
        if not generated_identifier_is_safe(self.partition_column):
            _fail("SQL_SEED_PLAN_INVALID", "partition column is invalid")
        names = tuple(column.name for column in self.columns)
        if len(set(names)) != len(names) or self.partition_column in names:
            _fail("SQL_SEED_PLAN_INVALID", "table columns must be unique")
        values = tuple(partition.value for partition in self.partitions)
        if values != _CANONICAL_PARTITION_VALUES:
            _fail(
                "SQL_SEED_PLAN_INVALID",
                "table must contain both canonical partitions exactly once",
            )
        for partition in self.partitions:
            partition.validate(self.columns)

    @property
    def schema_fingerprint(self) -> str:
        """Return a stable SHA-256 digest of the validated physical schema."""
        self.validate()
        return stable_fingerprint(
            {
                "columns": [
                    {"name": column.name, "type": column.data_type.value} for column in self.columns
                ],
                "partition": {"name": self.partition_column, "type": "STRING"},
                "storage": "ORC",
            }
        )

    @property
    def data_fingerprint(self) -> str:
        """Return a stable SHA-256 digest covering every canonical partition and row."""
        self.validate()
        return stable_fingerprint(
            {
                "partitions": [
                    {
                        "value": partition.value,
                        "rows": [[_json_scalar(value) for value in row] for row in partition.rows],
                    }
                    for partition in self.partitions
                ]
            }
        )


@dataclass(frozen=True, slots=True)
class SparkSeedPlan:
    """One runtime-owned main table and optional comparison table for a canonical case."""

    case_id: str
    ownership_token: str
    main: SparkTableSeed
    compare: SparkTableSeed | None = None

    def validate(self) -> None:
        """Bind the seed to a canonical 15862 case and collision-safe owner token."""
        if (
            _CASE_ID_RE.fullmatch(self.case_id) is None
            or _OWNERSHIP_TOKEN_RE.fullmatch(self.ownership_token) is None
        ):
            _fail("SQL_SEED_PLAN_INVALID", "case identity or ownership token is invalid")
        self.main.validate()
        if self.compare is not None:
            self.compare.validate()

    @property
    def table_names(self) -> tuple[str, ...]:
        """Return exact runtime-owned physical table names in creation order."""
        self.validate()
        base = f"test_table_15862_{self.case_id.lower()}_{self.ownership_token}"
        return (base, f"{base}_cmp") if self.compare is not None else (base,)

    @property
    def table_seeds(self) -> tuple[SparkTableSeed, ...]:
        """Return table seed definitions in the same order as table names."""
        return (self.main, self.compare) if self.compare is not None else (self.main,)

    @property
    def schema_fingerprint(self) -> str:
        """Return one stable schema digest for the complete table bundle."""
        self.validate()
        return stable_fingerprint(
            {
                "case_id": self.case_id,
                "tables": [seed.schema_fingerprint for seed in self.table_seeds],
            }
        )

    @property
    def data_fingerprint(self) -> str:
        """Return one stable data digest for the complete table bundle."""
        self.validate()
        return stable_fingerprint(
            {
                "case_id": self.case_id,
                "tables": [seed.data_fingerprint for seed in self.table_seeds],
            }
        )


@dataclass(frozen=True, slots=True)
class SparkSeedReceipt:
    """Secret-free proof of the seed bundle submitted to one platform binding."""

    case_id: str
    table_names: tuple[str, ...]
    schema_fingerprint: str
    data_fingerprint: str
    binding_fingerprint: str


@dataclass(frozen=True, slots=True)
class SparkCleanupReceipt:
    """Secret-free proof of the owned table names submitted for cleanup."""

    case_id: str
    table_names: tuple[str, ...]
    binding_fingerprint: str


def generated_identifier_is_safe(value: object) -> bool:
    """Return whether a generated Spark identifier meets the strict ASCII contract."""
    return isinstance(value, str) and _GENERATED_IDENTIFIER_RE.fullmatch(value) is not None


def spark_scalar_is_valid(data_type: SparkColumnType, value: object) -> bool:
    """Return whether one runtime value exactly matches its declared Spark scalar type."""
    if value is None:
        return True
    if data_type in {SparkColumnType.INT, SparkColumnType.BIGINT}:
        return isinstance(value, int) and not isinstance(value, bool)
    if data_type is SparkColumnType.STRING:
        return (
            isinstance(value, str)
            and len(value) <= _MAX_STRING_LENGTH
            and _CONTROL_RE.search(value) is None
        )
    if data_type is SparkColumnType.DATE:
        return type(value) is date
    return False


def _column_type_is_supported(value: object) -> bool:
    return isinstance(value, SparkColumnType)


def stable_fingerprint(value: object) -> str:
    """Return a canonical SHA-256 digest without retaining or emitting input material."""
    canonical = json.dumps(
        value,
        ensure_ascii=False,
        allow_nan=False,
        sort_keys=True,
        separators=(",", ":"),
    )
    return sha256(canonical.encode("utf-8")).hexdigest()


def _json_scalar(value: object) -> object:
    return value.isoformat() if type(value) is date else value


def _fail(code: str, detail: str) -> Never:
    raise SqlSeedError(code, detail)
