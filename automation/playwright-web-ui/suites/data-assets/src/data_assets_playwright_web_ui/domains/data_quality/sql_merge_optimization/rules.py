"""Typed rule-set and task provisioning contracts for SQL-merge journeys."""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum
from typing import Final

_MULTI_FIELD_MIN: Final = 2
CURRENT_UI_SOURCE_PACKAGE_LIMIT: Final = 20
CURRENT_UI_NORMATIVE_CHILD_LIMIT: Final = 10
SOURCE_PACKAGE_LIMIT_CODE: Final = "SQL_MERGE_SOURCE_PACKAGE_LIMIT"
NORMATIVE_CHILD_LIMIT_CODE: Final = "SQL_MERGE_NORMATIVE_CHILD_LIMIT"
RULE_EDITOR_CONTRACT_CODE: Final = "SQL_MERGE_RULE_EDITOR_CONTRACT_UNSUPPORTED"


class RuleSetProvisioningBlockedError(ValueError):
    """Raised before mutation when canonical rule-set semantics exceed a proven UI limit."""


class RuleEditorContractBlockedError(ValueError):
    """Raised before mutation when the typed editor lacks a source-backed UI route."""

    code = RULE_EDITOR_CONTRACT_CODE


class RuleCategory(StrEnum):
    """Rule categories exposed by the Data Quality rule-set editor."""

    COMPLETENESS = "完整性校验"
    VALIDITY = "有效性校验"
    UNIQUENESS = "唯一性校验"
    STATISTICAL = "统计性校验"
    CUSTOM_SQL = "自定义SQL"
    CONSISTENCY = "一致性校验"
    TIMELINESS = "时效性校验"
    REASONABLENESS = "合理性校验"


class RuleScope(StrEnum):
    """Canonical rule scopes."""

    FIELD = "字段级"
    TABLE = "单表"


class RuleStrength(StrEnum):
    """Strong and weak rule classifications that affect SQL grouping."""

    STRONG = "强规则"
    WEAK = "弱规则"


class LogicalRelation(StrEnum):
    """Canonical binary relations rendered by the UI."""

    AND = "且"
    OR = "或"


class ComparisonOperator(StrEnum):
    """Supported comparison operators used by canonical numeric controls."""

    EQ = "="
    NE = "!="
    GT = ">"
    GE = ">="
    LT = "<"
    LE = "<="


class EnumOperator(StrEnum):
    """Canonical enum membership operators."""

    IN = "in"
    NOT_IN = "not in"


class ParameterValueKind(StrEnum):
    """How a custom-SQL parameter is resolved for one provisioned case."""

    CURRENT_TABLE = "current-table"
    FIELD = "field"
    LITERAL = "literal"


@dataclass(frozen=True, slots=True)
class NumericPredicate:
    """One exact numeric operator and value pair."""

    operator: ComparisonOperator
    value: str

    def __post_init__(self) -> None:
        """Reject blank or control-character values before UI entry."""
        if not self.value.strip() or self.value != self.value.strip():
            message = "numeric predicate value must be non-empty trimmed text"
            raise ValueError(message)


@dataclass(frozen=True, slots=True)
class FixedValueSpec:
    """A fixed-value validation method and one numeric predicate."""

    predicate: NumericPredicate
    method: str | None = "固定值"


@dataclass(frozen=True, slots=True)
class NumericRangeSpec:
    """One- or two-sided numeric range with an explicit logical relation."""

    first: NumericPredicate
    relation: LogicalRelation | None = None
    second: NumericPredicate | None = None

    def __post_init__(self) -> None:
        """Require the relation and second predicate to appear together."""
        if (self.relation is None) != (self.second is None):
            message = "numeric range relation and second predicate must be declared together"
            raise ValueError(message)


@dataclass(frozen=True, slots=True)
class EnumValueSpec:
    """One exact enum membership operation and ordered value set."""

    operator: EnumOperator
    values: tuple[str, ...]

    def __post_init__(self) -> None:
        """Reject empty, blank, or duplicated enum values."""
        if (
            not self.values
            or any(not value.strip() or value != value.strip() for value in self.values)
            or len(set(self.values)) != len(self.values)
        ):
            message = "enum values must be unique non-empty trimmed text"
            raise ValueError(message)


@dataclass(frozen=True, slots=True)
class RangeAndEnumSpec:
    """Numeric range and enum constraints joined by an explicit relation."""

    numeric_range: NumericRangeSpec
    enum_values: EnumValueSpec
    relation: LogicalRelation


@dataclass(frozen=True, slots=True)
class PrecisionSpec:
    """Maximum integer and fractional digit predicates."""

    integer_digits: NumericPredicate
    relation: LogicalRelation
    fractional_digits: NumericPredicate


@dataclass(frozen=True, slots=True)
class CrossTableUniqueSpec:
    """Cross-table uniqueness settings using the current case table as comparison."""

    comparison_relation: LogicalRelation
    compare_field: str
    field_logic: str = "唯一"


@dataclass(frozen=True, slots=True)
class TableRowCountCompareSpec:
    """Compare the current table row count with the current case comparison table."""

    use_current_database: bool = True
    use_current_table: bool = True


@dataclass(frozen=True, slots=True)
class CustomSqlParameter:
    """One named parameter for a selected custom SQL template."""

    name: str
    kind: ParameterValueKind
    value: str | None = None

    def __post_init__(self) -> None:
        """Require literals and field references to carry their value."""
        if not self.name.strip():
            message = "custom SQL parameter name must be non-empty"
            raise ValueError(message)
        if self.kind is not ParameterValueKind.CURRENT_TABLE and not (self.value or "").strip():
            message = "field and literal custom SQL parameters require a value"
            raise ValueError(message)


@dataclass(frozen=True, slots=True)
class CustomSqlSpec:
    """Selected custom SQL template and its typed parameters."""

    template_name: str
    rule_family: str
    sql_template: str
    parameters: tuple[CustomSqlParameter, ...]
    expected: FixedValueSpec


@dataclass(frozen=True, slots=True)
class ConsistencySpec:
    """Cross-table consistency keys and ordered field mappings."""

    main_fields: tuple[str, ...]
    main_key: str
    compare_key: str
    mappings: tuple[tuple[str, str], ...]


@dataclass(frozen=True, slots=True)
class TimeDifferenceSpec:
    """Single- or multi-field time-difference comparison."""

    order_field: str | None
    compare_fields: tuple[str, ...]
    predicate: NumericPredicate
    unit: str
    field_relation: str | None = None


@dataclass(frozen=True, slots=True)
class TrendSpec:
    """Ordered field trend expectation."""

    order_field: str
    method: str


@dataclass(frozen=True, slots=True)
class CalculationSpec:
    """Calculated expression and field comparison expectation."""

    expression: str
    method: str
    compare_field: str
    operator: ComparisonOperator


RuleDetail = (
    FixedValueSpec
    | NumericRangeSpec
    | EnumValueSpec
    | RangeAndEnumSpec
    | PrecisionSpec
    | CrossTableUniqueSpec
    | TableRowCountCompareSpec
    | CustomSqlSpec
    | ConsistencySpec
    | TimeDifferenceSpec
    | TrendSpec
    | CalculationSpec
)


@dataclass(frozen=True, slots=True)
class RuleSpec:
    """Complete canonical configuration for one independently persisted subrule."""

    index: int
    category: RuleCategory
    function_name: str
    strength: RuleStrength
    detail: RuleDetail
    scope: RuleScope | None = None
    fields: tuple[str, ...] = ()
    field_relation: LogicalRelation | None = None
    filter_expression: str | None = None

    def __post_init__(self) -> None:
        """Reject incomplete identities and contradictory multi-field semantics."""
        if isinstance(self.index, bool) or self.index < 1:
            message = "rule index must be a positive integer"
            raise ValueError(message)
        if not self.function_name.strip():
            message = "rule function name must be non-empty"
            raise ValueError(message)
        if len(set(self.fields)) != len(self.fields) or any(
            not value.strip() for value in self.fields
        ):
            message = "rule fields must be unique non-empty names"
            raise ValueError(message)
        if len(self.fields) >= _MULTI_FIELD_MIN and self.field_relation is None:
            message = "multi-field rules must declare their exact field relation"
            raise ValueError(message)
        if len(self.fields) < _MULTI_FIELD_MIN and self.field_relation is not None:
            message = "field relation is only valid for multi-field rules"
            raise ValueError(message)
        if self.filter_expression is not None and not self.filter_expression.strip():
            message = "rule filter must be non-empty when present"
            raise ValueError(message)


@dataclass(frozen=True, slots=True)
class SourceRuleCardSpec:
    """One visible rule-set card and its independently persisted executable rules."""

    category: RuleCategory
    rules: tuple[RuleSpec, ...]

    def __post_init__(self) -> None:
        """Keep parent-only fields explicit and reject ambiguous child identities."""
        if not self.rules or any(rule.category is not self.category for rule in self.rules):
            message = "source rule card requires non-empty rules from one category"
            raise ValueError(message)
        if self.category is not RuleCategory.VALIDITY and len(self.rules) != 1:
            message = "only validity cards may contain nested executable rules"
            raise ValueError(message)
        if self.category is RuleCategory.VALIDITY:
            first = self.rules[0]
            if (
                len(first.fields) != 1
                or any(rule.fields != first.fields for rule in self.rules)
                or any(rule.strength is not first.strength for rule in self.rules)
                or any(rule.scope is not None for rule in self.rules)
                or any(rule.field_relation is not None for rule in self.rules)
                or len({rule.function_name for rule in self.rules}) != len(self.rules)
            ):
                message = (
                    "validity card children must share one field and strength with unique functions"
                )
                raise ValueError(message)

    @property
    def fields(self) -> tuple[str, ...]:
        """Return fields owned by the parent card rather than a nested function row."""
        return self.rules[0].fields

    @property
    def strength(self) -> RuleStrength:
        """Return strength persisted on the parent card and copied to every child."""
        return self.rules[0].strength


@dataclass(frozen=True, slots=True)
class RulePackageSpec:
    """One canonical source rule package with every explicit Rule-card specification."""

    base_name: str
    purpose: str
    rules: tuple[RuleSpec, ...]

    def __post_init__(self) -> None:
        """Require sequential, unique rule indices and a non-empty package."""
        indices = tuple(rule.index for rule in self.rules)
        if not self.base_name.strip() or not self.purpose.strip() or not self.rules:
            message = "rule package requires base name, purpose, and explicit rules"
            raise ValueError(message)
        if tuple(sorted(indices)) != indices or len(set(indices)) != len(indices):
            message = "rule package indices must be globally ordered and unique"
            raise ValueError(message)

    @property
    def source_cards(self) -> tuple[SourceRuleCardSpec, ...]:
        """Group NORMATIVE children by their real parent-card fields and strength."""
        cards: list[SourceRuleCardSpec] = []
        validity_positions: dict[tuple[tuple[str, ...], RuleStrength], int] = {}
        for rule in self.rules:
            if rule.category is not RuleCategory.VALIDITY:
                cards.append(SourceRuleCardSpec(category=rule.category, rules=(rule,)))
                continue
            key = (rule.fields, rule.strength)
            position = validity_positions.get(key)
            if position is None:
                validity_positions[key] = len(cards)
                cards.append(SourceRuleCardSpec(category=rule.category, rules=(rule,)))
                continue
            existing = cards[position]
            cards[position] = SourceRuleCardSpec(
                category=RuleCategory.VALIDITY,
                rules=(*existing.rules, rule),
            )
        return tuple(cards)


@dataclass(frozen=True, slots=True)
class RuleSetSpec:
    """One table-bound UI rule set containing canonical source packages."""

    description_base: str
    source_packages: tuple[RulePackageSpec, ...]

    def __post_init__(self) -> None:
        """Require packages to cover one globally sequential rule sequence."""
        if not self.description_base.strip() or not self.source_packages:
            message = "rule set requires a description and at least one package"
            raise ValueError(message)
        indices = tuple(rule.index for package in self.source_packages for rule in package.rules)
        if indices != tuple(range(1, len(indices) + 1)):
            message = "rule-set packages must cover globally sequential rules exactly once"
            raise ValueError(message)

    @property
    def rules(self) -> tuple[RuleSpec, ...]:
        """Return every rule in stable package and rule order."""
        return tuple(rule for package in self.source_packages for rule in package.rules)

    @property
    def source_cards(self) -> tuple[SourceRuleCardSpec, ...]:
        """Return every visible parent card in stable package/card order."""
        return tuple(card for package in self.source_packages for card in package.source_cards)

    def require_current_ui_compatible(self) -> None:
        """Enforce only source-backed package and nested NORMATIVE-list limits."""
        if len(self.source_packages) > CURRENT_UI_SOURCE_PACKAGE_LIMIT:
            message = (
                f"{SOURCE_PACKAGE_LIMIT_CODE}: canonical rule set exceeds the current UI "
                "source-package limit; it must not be silently collapsed"
            )
            raise RuleSetProvisioningBlockedError(message)
        oversized = tuple(
            card
            for card in self.source_cards
            if card.category is RuleCategory.VALIDITY
            and len(card.rules) > CURRENT_UI_NORMATIVE_CHILD_LIMIT
        )
        if oversized:
            message = (
                f"{NORMATIVE_CHILD_LIMIT_CODE}: canonical validity parent exceeds the "
                "current UI nested standard-rule limit; it must not be silently split"
            )
            raise RuleSetProvisioningBlockedError(message)

    def require_source_backed_editor(self) -> None:
        """Fail before mutation unless every card uses a source-backed editor contract."""
        unsupported = tuple(rule for rule in self.rules if not _source_backed_rule_detail(rule))
        if unsupported:
            message = (
                f"{RULE_EDITOR_CONTRACT_CODE}: current candidate has no complete "
                "source-backed editor and request matcher for one or more rule details"
            )
            raise RuleEditorContractBlockedError(message)


def _source_backed_rule_detail(rule: RuleSpec) -> bool:
    if rule.category is RuleCategory.COMPLETENESS:
        return isinstance(rule.detail, FixedValueSpec)
    if rule.category is not RuleCategory.VALIDITY:
        return False
    if isinstance(rule.detail, (FixedValueSpec, NumericRangeSpec, PrecisionSpec)):
        return True
    return isinstance(rule.detail, EnumValueSpec) and rule.detail.operator is EnumOperator.IN


@dataclass(frozen=True, slots=True)
class TaskSpec:
    """One manual task configuration bound to a newly created rule package."""

    base_name: str
    merge_batch_size: int
    sampling_percent: int | None
    partition_filter: str | None
    report_name_base: str
    expected_generated_sql_package_count: int | None = None
    schedule_mode: str = "手动触发"
    resource_group: str = "默认资源组"
    report_mode: str = "展示最新结果"
    include_vehicle: bool = False

    def __post_init__(self) -> None:
        """Enforce the current Spark task options represented by canonical YAML."""
        if self.merge_batch_size < 1:
            message = "task merge batch size must be positive"
            raise ValueError(message)
        if self.sampling_percent not in {None, 50}:
            message = "task sampling must be disabled or exactly 50 percent"
            raise ValueError(message)
        if self.partition_filter not in {None, "dt=2026-08-04"}:
            message = "task partition must be absent or dt=2026-08-04"
            raise ValueError(message)
        if (
            self.expected_generated_sql_package_count is not None
            and self.expected_generated_sql_package_count < 1
        ):
            message = "task SQL option count must be positive"
            raise ValueError(message)
        if any(
            not value.strip()
            for value in (
                self.base_name,
                self.report_name_base,
                self.schedule_mode,
                self.resource_group,
                self.report_mode,
            )
        ):
            message = "task schedule, resource group, and report settings must be explicit"
            raise ValueError(message)
        if self.schedule_mode != "手动触发":
            message = "SQL-merge candidates must use the canonical manual schedule"
            raise ValueError(message)
        if self.report_mode not in {"展示最新结果", "展示全部结果"}:
            message = "task report mode must match one exact UI option"
            raise ValueError(message)


@dataclass(frozen=True, slots=True)
class TaskRevisionSpec:
    """A required UI mutation applied after the initial task has been verified."""

    merge_batch_size: int
    strength_overrides: tuple[tuple[int, RuleStrength], ...] = ()
    reimport_package: bool = False

    def __post_init__(self) -> None:
        """Reject duplicated overrides and invalid batch sizes."""
        if self.merge_batch_size < 1:
            message = "revised merge batch size must be positive"
            raise ValueError(message)
        indices = tuple(index for index, _strength in self.strength_overrides)
        if len(set(indices)) != len(indices) or any(index < 1 for index in indices):
            message = "task revision strength overrides must use unique positive rule indices"
            raise ValueError(message)


@dataclass(frozen=True, slots=True)
class ProvisionedNames:
    """Collision-safe names materialized from one immutable automation identity."""

    rule_set_description: str
    package_names: tuple[str, ...]
    task_name: str
    report_name: str
    rule_descriptions: tuple[str, ...]
    card_descriptions: tuple[str, ...]


MAX_RULE_NAME_LENGTH: Final = 50
