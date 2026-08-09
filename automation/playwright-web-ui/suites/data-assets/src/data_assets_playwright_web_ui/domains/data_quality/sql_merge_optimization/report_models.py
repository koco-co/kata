"""Generated quality-report identities and exact persisted readbacks."""

from __future__ import annotations

from dataclasses import dataclass

from .case_ids import SAFE_ID_RE, TIMESTAMP_RE

_REPORT_SUCCESS_STATUS = 2
_REPORT_TERMINAL_STATUSES = frozenset({_REPORT_SUCCESS_STATUS, 3})
_RULE_TERMINAL_STATUSES = frozenset({3, 4, 11})
_MAX_PASS_RATE = 100


@dataclass(frozen=True, slots=True)
class ReportBaseline:
    """Immutable generated-report IDs captured before task execution."""

    record_ids: tuple[str, ...]

    def __post_init__(self) -> None:
        """Reject duplicate or selector-unsafe report identities."""
        if len(set(self.record_ids)) != len(self.record_ids) or any(
            SAFE_ID_RE.fullmatch(value) is None for value in self.record_ids
        ):
            message = "report baseline IDs must be unique safe identifiers"
            raise ValueError(message)


@dataclass(frozen=True, slots=True)
class GeneratedReportRecord:
    """One generated-report list record bound to a unique runtime report name."""

    record_id: str
    report_name: str
    table_names: str
    status: int
    finished_at: str | None

    def __post_init__(self) -> None:
        """Reject unsafe list identities and invalid terminal timestamps."""
        if SAFE_ID_RE.fullmatch(self.record_id) is None:
            message = "generated report requires a safe record ID"
            raise ValueError(message)
        if not self.report_name.strip() or not self.table_names.strip():
            message = "generated report requires a name and table identity"
            raise ValueError(message)
        if self.status < 0:
            message = "generated report status must be non-negative"
            raise ValueError(message)
        if self.finished_at is not None and TIMESTAMP_RE.fullmatch(self.finished_at) is None:
            message = "generated report finish time must use yyyy-MM-dd HH:mm:ss"
            raise ValueError(message)

    @property
    def is_terminal(self) -> bool:
        """Return whether report generation ended successfully or failed."""
        return self.status in _REPORT_TERMINAL_STATUSES

    @property
    def is_success(self) -> bool:
        """Return whether the report generation status is success(2)."""
        return self.status == _REPORT_SUCCESS_STATUS


@dataclass(frozen=True, slots=True)
class ReportRuleRecord:
    """One report-detail row with exact persisted rule and result identity."""

    record_id: str
    rule_id: str
    function_type: str
    function_name: str
    rule_description: str
    column_name: str | None
    column_type: str | None
    status: int
    failure_reason: str
    detail: str
    finished_at_epoch_ms: int
    level: int

    def __post_init__(self) -> None:
        """Require stable persisted identities and a terminal rule result."""
        if any(SAFE_ID_RE.fullmatch(value) is None for value in (self.record_id, self.rule_id)):
            message = "report rule requires safe record and rule IDs"
            raise ValueError(message)
        if not self.function_type.strip() or not self.function_name.strip():
            message = "report rule requires type and function name"
            raise ValueError(message)
        if self.status not in _RULE_TERMINAL_STATUSES:
            message = "report rule status must be PASS, UNPASS, or CHECK_ABNORMAL"
            raise ValueError(message)
        if self.finished_at_epoch_ms < 1 or self.level < 0:
            message = "report rule requires positive finish time and non-negative level"
            raise ValueError(message)


@dataclass(frozen=True, slots=True)
class ReportTableRecord:
    """One report table survey and its complete ordered rule rows."""

    table_name: str
    task_name: str
    datasource_name: str
    schema_name: str
    partition_value: str
    table_rows: int
    sample_count: int
    vehicle_count: int
    field_count: int
    rule_count: int
    pass_rate: float
    rules: tuple[ReportRuleRecord, ...]

    def __post_init__(self) -> None:
        """Require exact non-empty table identity, counts, and persisted rule rows."""
        if any(
            not value.strip()
            for value in (
                self.table_name,
                self.task_name,
                self.datasource_name,
                self.schema_name,
            )
        ):
            message = "report table requires task, table, datasource, and schema identity"
            raise ValueError(message)
        counts = (
            self.table_rows,
            self.sample_count,
            self.vehicle_count,
            self.field_count,
            self.rule_count,
        )
        if any(value < 0 for value in counts) or not 0 <= self.pass_rate <= _MAX_PASS_RATE:
            message = "report table counts and pass rate must be bounded"
            raise ValueError(message)
        if self.rule_count != len(self.rules):
            message = "report table ruleCount must equal the complete rule-row readback"
            raise ValueError(message)
        rule_ids = tuple(rule.rule_id for rule in self.rules)
        if len(set(rule_ids)) != len(rule_ids):
            message = "report table rule IDs must be unique"
            raise ValueError(message)


@dataclass(frozen=True, slots=True)
class GeneratedReportDetail:
    """One generated quality report linked to its exact report-list record."""

    record_id: str
    report_name: str
    finished_at: str
    include_vehicle: bool
    tables: tuple[ReportTableRecord, ...]

    def __post_init__(self) -> None:
        """Require safe IDs, canonical completion time, and non-empty table content."""
        if SAFE_ID_RE.fullmatch(self.record_id) is None:
            message = "report detail requires a safe record ID"
            raise ValueError(message)
        if TIMESTAMP_RE.fullmatch(self.finished_at) is None:
            message = "report detail requires yyyy-MM-dd HH:mm:ss completion time"
            raise ValueError(message)
        if not self.report_name.strip() or not self.tables:
            message = "report detail requires a name and at least one table"
            raise ValueError(message)

    def as_json(self) -> dict[str, object]:
        """Return the non-secret report evidence persisted in business records."""
        return {
            "report_record_id": self.record_id,
            "report_name": self.report_name,
            "finished_at": self.finished_at,
            "include_vehicle": self.include_vehicle,
            "tables": [
                {
                    "table_name": table.table_name,
                    "task_name": table.task_name,
                    "rule_count": table.rule_count,
                    "pass_rate": table.pass_rate,
                    "rule_ids": [rule.rule_id for rule in table.rules],
                }
                for table in self.tables
            ],
        }
