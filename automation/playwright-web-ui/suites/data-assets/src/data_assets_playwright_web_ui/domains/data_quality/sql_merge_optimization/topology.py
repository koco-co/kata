"""Typed SQL topology and execution-result expectations."""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum
from typing import Final

from .case_ids import SAFE_ID_RE

_MIN_MERGED_GROUP_SIZE: Final = 2


class FieldShape(StrEnum):
    """Canonical source-field shapes that materially affect generated SQL."""

    SINGLE_FIELD = "single-field"
    MULTI_FIELD = "multi-field"
    MIXED = "mixed"


class MergeMode(StrEnum):
    """Expected relationship between rules and generated SQL scans."""

    FULL = "full"
    PARTIAL = "partial"
    NONE = "none"


@dataclass(frozen=True, slots=True)
class SqlTopologyExpectation:
    """Explicit Spark SQL grouping, sampling, and partition semantics."""

    mode: MergeMode
    merged_rule_groups: tuple[tuple[int, ...], ...]
    isolated_rules: tuple[int, ...]
    sampling_percent: int | None
    partition_filter: str | None = None
    distinct_rule_groups: tuple[tuple[int, ...], ...] = ()
    dirty_target_groups: tuple[tuple[int, ...], ...] | None = None

    def __post_init__(self) -> None:
        """Reject internally contradictory SQL expectations."""
        self._validate_runtime_filters()
        self._validate_sql_groups()
        self._validate_distinct_groups()
        if self.dirty_target_groups is not None:
            self._validate_dirty_target_groups()

    def _validate_runtime_filters(self) -> None:
        """Restrict sampling and partition values to canonical case semantics."""
        if self.sampling_percent not in {None, 50}:
            message = "canonical sampling_percent must be 50 or None"
            raise ValueError(message)
        if self.partition_filter not in {None, "dt=2026-08-04"}:
            message = "canonical partition_filter must be dt=2026-08-04 or None"
            raise ValueError(message)

    def _validate_sql_groups(self) -> None:
        """Require disjoint rule groups compatible with the declared merge mode."""
        if any(len(group) < _MIN_MERGED_GROUP_SIZE for group in self.merged_rule_groups):
            message = "merged topology groups must contain at least two rules"
            raise ValueError(message)
        flattened = tuple(index for group in self.merged_rule_groups for index in group)
        if len(set(flattened)) != len(flattened):
            message = "merged topology groups cannot overlap"
            raise ValueError(message)
        if len(set(self.isolated_rules)) != len(self.isolated_rules):
            message = "isolated topology rules cannot repeat"
            raise ValueError(message)
        if set(flattened) & set(self.isolated_rules):
            message = "merged and isolated topology rules cannot overlap"
            raise ValueError(message)
        if self.mode is MergeMode.FULL and (not self.merged_rule_groups or self.isolated_rules):
            message = "full topology requires merged groups and no isolated rules"
            raise ValueError(message)
        if self.mode is MergeMode.PARTIAL and (
            not self.merged_rule_groups or not self.isolated_rules
        ):
            message = "partial topology requires merged and isolated rules"
            raise ValueError(message)
        if self.mode is MergeMode.NONE and (self.merged_rule_groups or not self.isolated_rules):
            message = "none topology requires only isolated rules"
            raise ValueError(message)

    def _validate_distinct_groups(self) -> None:
        """Bind count-distinct semantics to whole declared SQL groups."""
        expected_groups = set(self.expected_rule_groups)
        distinct_groups = {tuple(sorted(group)) for group in self.distinct_rule_groups}
        if len(distinct_groups) != len(self.distinct_rule_groups):
            message = "distinct topology groups cannot repeat"
            raise ValueError(message)
        if not distinct_groups <= expected_groups:
            message = "distinct topology groups must identify complete SQL rule groups"
            raise ValueError(message)

    @property
    def expected_rule_groups(self) -> tuple[tuple[int, ...], ...]:
        """Return normalized merged groups followed by singleton SQL groups."""
        return tuple(
            tuple(sorted(group))
            for group in (
                *self.merged_rule_groups,
                *((index,) for index in self.isolated_rules),
            )
        )

    @property
    def expected_dirty_target_groups(self) -> tuple[tuple[int, ...], ...]:
        """Return rule equivalence classes that must share one dirty target."""
        configured = self.dirty_target_groups
        return (
            self.expected_rule_groups
            if configured is None
            else tuple(tuple(sorted(group)) for group in configured)
        )

    @property
    def expected_scan_groups(self) -> int:
        """Return the number of merged queries plus independent rule queries."""
        return len(self.merged_rule_groups) + len(self.isolated_rules)

    def validate_rule_indices(self, rule_count: int) -> None:
        """Require every configured rule to appear in exactly one SQL group."""
        actual = {index for group in self.merged_rule_groups for index in group} | set(
            self.isolated_rules
        )
        expected = set(range(1, rule_count + 1))
        if actual != expected:
            message = "topology must cover every configured rule exactly once"
            raise ValueError(message)

    def _validate_dirty_target_groups(self) -> None:
        """Require target equivalence classes to partition complete SQL groups."""
        configured = self.expected_dirty_target_groups
        flattened = tuple(index for group in configured for index in group)
        expected_indices = {index for group in self.expected_rule_groups for index in group}
        if not configured or len(flattened) != len(set(flattened)):
            message = "dirty-target topology groups must be non-empty and cannot overlap"
            raise ValueError(message)
        if set(flattened) != expected_indices:
            message = "dirty-target topology groups must cover every rule exactly once"
            raise ValueError(message)
        target_sets = tuple(set(group) for group in configured)
        if any(
            not any(set(sql_group) <= target_group for target_group in target_sets)
            for sql_group in self.expected_rule_groups
        ):
            message = "one SQL rule group cannot be split across dirty-data targets"
            raise ValueError(message)


@dataclass(frozen=True, slots=True)
class RuleResultExpectation:
    """Expected subrule indices after a fresh manual execution."""

    passed_rules: tuple[int, ...] = ()
    unpassed_rules: tuple[int, ...] = ()

    def __post_init__(self) -> None:
        """Reject duplicate or contradictory result indices."""
        if any(index < 1 for index in (*self.passed_rules, *self.unpassed_rules)):
            message = "result rule indices must be positive"
            raise ValueError(message)
        if len(set(self.passed_rules)) != len(self.passed_rules) or len(
            set(self.unpassed_rules)
        ) != len(self.unpassed_rules):
            message = "result rule indices cannot repeat"
            raise ValueError(message)
        if set(self.passed_rules) & set(self.unpassed_rules):
            message = "passed and unpassed rule indices cannot overlap"
            raise ValueError(message)

    @property
    def has_explicit_matrix(self) -> bool:
        """Return whether canonical YAML declares exact pass/fail membership."""
        return bool(self.passed_rules or self.unpassed_rules)

    def validate_rule_indices(self, rule_count: int) -> None:
        """Require an explicit matrix, when present, to cover all subrules."""
        if not self.has_explicit_matrix:
            return
        actual = set(self.passed_rules) | set(self.unpassed_rules)
        expected = set(range(1, rule_count + 1))
        if actual != expected:
            message = "explicit result matrix must cover every configured rule"
            raise ValueError(message)


@dataclass(frozen=True, slots=True)
class SqlRuleIdentity:
    """Stable persisted rule identity used to bind one rule to rendered SQL."""

    index: int
    token: str

    def __post_init__(self) -> None:
        """Require the positive numeric identifier persisted by the backend."""
        if isinstance(self.index, bool) or self.index < 1:
            message = "SQL rule identity index must be a positive integer"
            raise ValueError(message)
        if (
            SAFE_ID_RE.fullmatch(self.token) is None
            or not self.token.isdigit()
            or int(self.token) < 1
        ):
            message = "SQL rule identity token must be a positive numeric persisted ID"
            raise ValueError(message)
