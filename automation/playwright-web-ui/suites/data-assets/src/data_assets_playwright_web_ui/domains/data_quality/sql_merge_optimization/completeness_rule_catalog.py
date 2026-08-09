"""Explicit single- and multi-field completeness rule configurations."""

from __future__ import annotations

from enum import StrEnum

from .catalog_builders import fixed_rule
from .rules import (
    ComparisonOperator,
    LogicalRelation,
    RuleCategory,
    RuleScope,
    RuleSpec,
)


class CompletenessRuleProfile(StrEnum):
    """Canonical field shape and expected-result profiles."""

    MULTI_MIXED = "multi-mixed"
    SINGLE_MIXED = "single-mixed"
    MULTI_UNPASSED = "multi-unpassed"
    MULTI_PASSED = "multi-passed"
    SINGLE_UNPASSED = "single-unpassed"
    SINGLE_PASSED = "single-passed"
    SINGLE_FULL_UNPASSED = "single-full-unpassed"
    SINGLE_FULL_PASSED = "single-full-passed"


def _field_rule(
    index: int,
    function_name: str,
    fields: tuple[str, ...],
    relation: LogicalRelation | None,
    predicate: tuple[ComparisonOperator, str],
) -> RuleSpec:
    return fixed_rule(
        index,
        RuleCategory.COMPLETENESS,
        function_name,
        operator=predicate[0],
        value=predicate[1],
        scope=RuleScope.FIELD,
        fields=fields,
        field_relation=relation,
        filter_expression="id<=100",
    )


def completeness_rules(profile: CompletenessRuleProfile) -> tuple[RuleSpec, ...]:
    """Return every exact completeness rule for the selected business profile."""
    multi = profile in {
        CompletenessRuleProfile.MULTI_MIXED,
        CompletenessRuleProfile.MULTI_UNPASSED,
        CompletenessRuleProfile.MULTI_PASSED,
    }
    mixed = profile in {
        CompletenessRuleProfile.MULTI_MIXED,
        CompletenessRuleProfile.SINGLE_MIXED,
    }
    passed = profile in {
        CompletenessRuleProfile.MULTI_PASSED,
        CompletenessRuleProfile.SINGLE_PASSED,
        CompletenessRuleProfile.SINGLE_FULL_PASSED,
    }
    single_full_unpassed = profile is CompletenessRuleProfile.SINGLE_FULL_UNPASSED
    single_full_passed = profile is CompletenessRuleProfile.SINGLE_FULL_PASSED
    id_fields = ("id", "age") if multi else ("id",)
    text_fields = ("name", "address") if multi else ("name",)
    id_and = LogicalRelation.AND if multi else None
    id_or = LogicalRelation.OR if multi else None
    text_or = LogicalRelation.OR if multi else None
    text_and = LogicalRelation.AND if multi else None
    if single_full_unpassed:
        predicates = (
            (ComparisonOperator.NE, "0"),
            (ComparisonOperator.GT, "0"),
            (ComparisonOperator.GT, "1"),
            (ComparisonOperator.EQ, "1"),
            (ComparisonOperator.EQ, "0"),
        )
    elif single_full_passed:
        predicates = (
            (ComparisonOperator.EQ, "0"),
            (ComparisonOperator.EQ, "0"),
            (ComparisonOperator.EQ, "0"),
            (ComparisonOperator.EQ, "0"),
            (ComparisonOperator.GT, "0"),
        )
    elif mixed or passed:
        predicates = (
            (ComparisonOperator.NE if multi else ComparisonOperator.GE, "1" if multi else "0"),
            (ComparisonOperator.EQ, "0"),
            (
                ComparisonOperator.GE
                if mixed and multi
                else (
                    ComparisonOperator.GT
                    if mixed
                    else (ComparisonOperator.LE if multi else ComparisonOperator.NE)
                ),
                "100"
                if mixed and multi
                else ("0" if passed and multi else ("0" if mixed else "1")),
            ),
            (
                ComparisonOperator.NE if mixed and multi else ComparisonOperator.EQ,
                "0" if not mixed else ("0" if multi else "1"),
            ),
            (ComparisonOperator.GT, "0"),
        )
    else:
        predicates = (
            (ComparisonOperator.EQ, "1" if multi else "10"),
            (ComparisonOperator.EQ if multi else ComparisonOperator.NE, "10" if multi else "0"),
            (ComparisonOperator.GE if multi else ComparisonOperator.GT, "100" if multi else "0"),
            (ComparisonOperator.NE if multi else ComparisonOperator.EQ, "0" if multi else "1"),
            (ComparisonOperator.EQ, "0"),
        )
    rules = (
        _field_rule(1, "空值数", id_fields, id_and, predicates[0]),
        _field_rule(2, "空值率", id_fields, id_or, predicates[1]),
        _field_rule(3, "空串数", text_fields, text_or, predicates[2]),
        _field_rule(4, "空串率", text_fields, text_and, predicates[3]),
        fixed_rule(
            5,
            RuleCategory.COMPLETENESS,
            "表行数",
            operator=predicates[4][0],
            value=predicates[4][1],
            scope=RuleScope.TABLE,
            filter_expression="id<=100",
        ),
    )
    if not mixed:
        return rules
    return (
        *rules,
        fixed_rule(
            6,
            RuleCategory.COMPLETENESS,
            "表行数",
            operator=ComparisonOperator.EQ,
            value="0",
            scope=RuleScope.TABLE,
            filter_expression="id<=100",
        ),
    )
