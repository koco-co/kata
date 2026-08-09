"""Explicit completeness-plus-validity rule families from the canonical cases."""

from __future__ import annotations

from enum import StrEnum

from .catalog_builders import enum_rule, fixed_rule, range_enum_rule, range_rule
from .rules import (
    ComparisonOperator,
    EnumOperator,
    LogicalRelation,
    RuleCategory,
    RuleScope,
    RuleSpec,
    RuleStrength,
)

_DEFAULT_ENUM_VALUES = ("25", "30", "28", "35")


class CombinedRuleProfile(StrEnum):
    """Named business profiles shared only when every rule setting is identical."""

    MIXED_STRENGTH = "mixed-strength"
    DIFFERENT_FILTERS = "different-filters"
    STRING_TO_INT = "string-to-int"
    STRING_TO_INT_ID_RANGE = "string-to-int-id-range"
    SAME_FILTER = "same-filter"


def combined_rules(
    profile: CombinedRuleProfile,
    *,
    include_string_length: bool = False,
) -> tuple[RuleSpec, ...]:
    """Return the exact ordered rules for one declared combined-rule profile."""
    mixed_strength = profile is CombinedRuleProfile.MIXED_STRENGTH
    different_filters = profile is CombinedRuleProfile.DIFFERENT_FILTERS
    string_to_int = profile in {
        CombinedRuleProfile.STRING_TO_INT,
        CombinedRuleProfile.STRING_TO_INT_ID_RANGE,
    }
    id_fields = ("id", "string_num") if string_to_int else ("id", "age")
    value_field = "string_num" if string_to_int else "id"
    enum_field = "string_num" if string_to_int else "age"
    filters = (
        "id<=100",
        "id<=80" if different_filters else "id<=100",
        "id<=10" if different_filters else "id<=100",
        None if different_filters else "id<=100",
        "id<=100",
        "id<=100",
        "id<=80" if different_filters else "id<=100",
        "id<=70" if different_filters else "id<=100",
        None if different_filters else "id<=100",
    )
    strengths = (
        RuleStrength.WEAK,
        RuleStrength.STRONG if mixed_strength else RuleStrength.WEAK,
        RuleStrength.STRONG if mixed_strength else RuleStrength.WEAK,
        RuleStrength.WEAK,
        RuleStrength.WEAK,
        RuleStrength.WEAK,
        RuleStrength.STRONG if mixed_strength else RuleStrength.WEAK,
        RuleStrength.WEAK,
        RuleStrength.STRONG if mixed_strength else RuleStrength.WEAK,
    )
    rules: list[RuleSpec] = [
        fixed_rule(
            1,
            RuleCategory.COMPLETENESS,
            "空值数",
            operator=ComparisonOperator.NE,
            value="1",
            scope=RuleScope.FIELD,
            fields=id_fields,
            field_relation=LogicalRelation.AND,
            filter_expression=filters[0],
            strength=strengths[0],
        ),
        fixed_rule(
            2,
            RuleCategory.COMPLETENESS,
            "空值率",
            operator=ComparisonOperator.EQ,
            value="0",
            scope=RuleScope.FIELD,
            fields=id_fields,
            field_relation=LogicalRelation.OR,
            filter_expression=filters[1],
            strength=strengths[1],
        ),
        fixed_rule(
            3,
            RuleCategory.COMPLETENESS,
            "空串数",
            operator=ComparisonOperator.GT,
            value="0",
            scope=RuleScope.FIELD,
            fields=("name",),
            filter_expression=filters[2],
            strength=strengths[2],
        ),
        fixed_rule(
            4,
            RuleCategory.COMPLETENESS,
            "空串率",
            operator=ComparisonOperator.EQ,
            value="1",
            scope=RuleScope.FIELD,
            fields=("name",),
            filter_expression=filters[3],
            strength=strengths[3],
        ),
    ]
    if not string_to_int:
        rules.append(
            fixed_rule(
                5,
                RuleCategory.COMPLETENESS,
                "表行数",
                operator=ComparisonOperator.GT,
                value="0",
                scope=RuleScope.TABLE,
                filter_expression=filters[4],
                strength=strengths[4],
            )
        )
    offset = len(rules)
    rules.extend(
        (
            range_rule(
                offset + 1,
                field=value_field,
                first=(ComparisonOperator.GT, "0"),
                relation=LogicalRelation.AND,
                second=(ComparisonOperator.LE, "100"),
                filter_expression=filters[5],
                strength=strengths[5],
            ),
            fixed_rule(
                offset + 2,
                RuleCategory.VALIDITY,
                "数值-枚举个数",
                operator=ComparisonOperator.GE,
                value="1",
                fields=("string_num",),
                filter_expression=filters[6],
                strength=strengths[6],
            ),
            enum_rule(
                offset + 3,
                field=enum_field,
                operator=EnumOperator.NOT_IN,
                values=_DEFAULT_ENUM_VALUES,
                filter_expression=filters[7],
                strength=strengths[7],
            ),
            range_enum_rule(
                offset + 4,
                field=(
                    "id"
                    if profile is CombinedRuleProfile.STRING_TO_INT_ID_RANGE
                    else "string_num"
                    if string_to_int
                    else "id"
                ),
                first=(ComparisonOperator.GT, "0"),
                range_relation=LogicalRelation.AND,
                second=(ComparisonOperator.LT, "5"),
                enum_operator=EnumOperator.IN,
                enum_values=("1",),
                relation=LogicalRelation.AND,
                filter_expression=filters[8],
                strength=strengths[8],
            ),
        )
    )
    if include_string_length:
        rules.append(
            fixed_rule(
                len(rules) + 1,
                RuleCategory.VALIDITY,
                "字符串长度",
                operator=ComparisonOperator.GE,
                value="1",
                fields=("address",),
                filter_expression="id<=100",
                strength=RuleStrength.STRONG if mixed_strength else RuleStrength.WEAK,
            )
        )
    return tuple(rules)
