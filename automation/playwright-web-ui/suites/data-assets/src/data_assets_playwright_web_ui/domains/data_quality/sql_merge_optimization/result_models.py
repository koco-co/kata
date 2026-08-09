"""Fresh execution identities and normalized table readbacks."""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum

from .case_ids import RUNTIME_TABLE_NAME_RE, SAFE_ID_RE, TABLE_NAME_RE, TIMESTAMP_RE


class RuleExecutionStatus(StrEnum):
    """Business result of one task-owned executable rule."""

    PASSED = "passed"
    UNPASSED = "unpassed"


@dataclass(frozen=True, slots=True)
class RuleExecutionReadback:
    """One canonical rule bound to its task-owned MonitorRule ID and result."""

    index: int
    monitor_rule_id: str
    description: str
    function_name: str
    status: RuleExecutionStatus

    def __post_init__(self) -> None:
        """Reject ambiguous rule identities before business evidence is recorded."""
        if isinstance(self.index, bool) or self.index < 1:
            message = "rule execution index must be a positive integer"
            raise ValueError(message)
        if not self.monitor_rule_id.isdigit() or int(self.monitor_rule_id) < 1:
            message = "rule execution must use a positive task-owned MonitorRule ID"
            raise ValueError(message)
        if not self.description.strip() or not self.function_name.strip():
            message = "rule execution must include description and function"
            raise ValueError(message)

    def as_json(self) -> dict[str, object]:
        """Return a complete non-secret per-rule evidence record."""
        return {
            "index": self.index,
            "persisted_id": self.monitor_rule_id,
            "description": self.description,
            "function": self.function_name,
            "status": self.status.value,
        }


@dataclass(frozen=True, slots=True)
class ResultBaseline:
    """Exact instance row keys present immediately before a task execution."""

    instance_ids: tuple[str, ...]
    latest_time: str | None

    def __post_init__(self) -> None:
        """Require unique CSS-safe row keys and a structured optional timestamp."""
        if len(set(self.instance_ids)) != len(self.instance_ids) or any(
            SAFE_ID_RE.fullmatch(value) is None for value in self.instance_ids
        ):
            message = "baseline instance IDs must be unique safe data-row-key values"
            raise ValueError(message)
        if self.latest_time is not None and TIMESTAMP_RE.fullmatch(self.latest_time) is None:
            message = "baseline latest_time must use yyyy-MM-dd HH:mm:ss"
            raise ValueError(message)

    def contains(self, instance_id: str) -> bool:
        """Return whether an instance already existed before this execution."""
        return instance_id in self.instance_ids


@dataclass(frozen=True, slots=True)
class TaskExecutionReadback:
    """Safe business values read from one fresh task result in the UI."""

    instance_id: str
    table_name: str
    task_name: str
    finished_at: str
    rule_results: tuple[RuleExecutionReadback, ...]

    def __post_init__(self) -> None:
        """Require an identifiable completed result with at least one rule."""
        if SAFE_ID_RE.fullmatch(self.instance_id) is None:
            message = "task execution readback must contain a safe UI instance ID"
            raise ValueError(message)
        if (
            TABLE_NAME_RE.fullmatch(self.table_name) is None
            and RUNTIME_TABLE_NAME_RE.fullmatch(self.table_name) is None
        ) or not self.task_name.strip():
            message = "task execution readback must identify a canonical table and task"
            raise ValueError(message)
        if TIMESTAMP_RE.fullmatch(self.finished_at) is None:
            message = "task execution readback must contain a UI timestamp"
            raise ValueError(message)
        indices = tuple(item.index for item in self.rule_results)
        persisted_ids = tuple(item.monitor_rule_id for item in self.rule_results)
        if indices != tuple(range(1, len(indices) + 1)) or len(set(persisted_ids)) != len(
            persisted_ids
        ):
            message = "task execution readback must contain ordered unique rule identities"
            raise ValueError(message)
        if not self.rule_results:
            message = "task execution readback must contain rule results"
            raise ValueError(message)

    @property
    def passed_functions(self) -> tuple[str, ...]:
        """Return passed function labels without replacing structured identities."""
        return tuple(
            item.function_name
            for item in self.rule_results
            if item.status is RuleExecutionStatus.PASSED
        )

    @property
    def unpassed_functions(self) -> tuple[str, ...]:
        """Return unpassed function labels without replacing structured identities."""
        return tuple(
            item.function_name
            for item in self.rule_results
            if item.status is RuleExecutionStatus.UNPASSED
        )

    def as_json(self) -> dict[str, object]:
        """Return business-record data without persisting SQL or environment secrets."""
        return {
            "instance_id": self.instance_id,
            "table_name": self.table_name,
            "task_name": self.task_name,
            "datasource_type": "SparkThrift2.x",
            "finished_at": self.finished_at,
            "rules": [item.as_json() for item in self.rule_results],
            "passed_functions": list(self.passed_functions),
            "unpassed_functions": list(self.unpassed_functions),
        }


@dataclass(frozen=True, slots=True)
class TableSnapshot:
    """Normalized headers and rendered business rows from a dirty-data table."""

    headers: tuple[str, ...]
    rows: tuple[tuple[str, ...], ...]

    def __post_init__(self) -> None:
        """Require rectangular, non-empty business data suitable for comparison."""
        if not self.headers or any(not value for value in self.headers):
            message = "table snapshot must contain non-empty headers"
            raise ValueError(message)
        if any(len(row) != len(self.headers) for row in self.rows):
            message = "table snapshot rows must match the header width"
            raise ValueError(message)
