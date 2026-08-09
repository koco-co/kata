"""Explicit passing and unpassing validity rule configurations."""

from __future__ import annotations

from enum import StrEnum

from .catalog_builders import enum_rule, fixed_rule, range_enum_rule, range_rule
from .rules import (
    ComparisonOperator,
    EnumOperator,
    LogicalRelation,
    RuleCategory,
    RuleSpec,
    RuleStrength,
)


class ValidityRuleProfile(StrEnum):
    """Result-oriented profiles whose configuration is explicit below."""

    MIXED = "mixed"
    ALL_UNPASSED = "all-unpassed"
    ALL_PASSED = "all-passed"


def validity_rules(profile: ValidityRuleProfile) -> tuple[RuleSpec, ...]:
    """Return the four exact validity rules for one canonical profile."""
    passed = profile is ValidityRuleProfile.ALL_PASSED
    unpassed = profile is ValidityRuleProfile.ALL_UNPASSED
    return (
        range_rule(
            1,
            field="id",
            first=(ComparisonOperator.GT, "20" if unpassed else "0"),
            relation=LogicalRelation.AND,
            second=(ComparisonOperator.LT if unpassed else ComparisonOperator.LE, "100"),
            filter_expression="id<=100",
            strength=RuleStrength.WEAK,
        ),
        fixed_rule(
            2,
            RuleCategory.VALIDITY,
            "数值-枚举个数",
            operator=ComparisonOperator.LT if unpassed else ComparisonOperator.GE,
            value="2" if unpassed else "1",
            fields=("string_num",),
            filter_expression="id<=100",
        ),
        enum_rule(
            3,
            field="age",
            operator=EnumOperator.IN if passed else EnumOperator.NOT_IN,
            values=("25", "30", "28", "35", "22", "29", "34", "20", "18")
            if passed
            else ("25", "30", "28", "35"),
            filter_expression="id<=100",
            strength=RuleStrength.WEAK,
        ),
        range_enum_rule(
            4,
            field="id",
            first=(ComparisonOperator.GT, "0"),
            range_relation=LogicalRelation.OR if passed else LogicalRelation.AND,
            second=(ComparisonOperator.LT, "100" if passed else "5"),
            enum_operator=EnumOperator.NOT_IN if passed else EnumOperator.IN,
            enum_values=("0",) if passed else ("1",),
            relation=LogicalRelation.AND,
            filter_expression="id<=100",
            strength=RuleStrength.WEAK,
        ),
    )
