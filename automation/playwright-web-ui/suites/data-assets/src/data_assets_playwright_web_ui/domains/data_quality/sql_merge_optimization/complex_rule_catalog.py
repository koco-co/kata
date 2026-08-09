"""Explicit rule families for mixed, partial, and non-mergeable SQL scenarios."""

from __future__ import annotations

from .catalog_builders import (
    calculation_rule,
    consistency_rule,
    cross_table_unique_rule,
    custom_sql_rule,
    enum_rule,
    fixed_rule,
    periodic_rule,
    precision_rule,
    range_enum_rule,
    range_rule,
    table_row_compare_rule,
    timeliness_rule,
    trend_rule,
)
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


def mixed_rules(
    *,
    same_filter: bool,
    mixed_strength: bool,
    second_rule_filter: str | None,
) -> tuple[RuleSpec, ...]:
    """Return the explicit 21-rule canonical mixed family."""
    strong = RuleStrength.STRONG
    weak = RuleStrength.WEAK
    strengths = (
        weak,
        strong if mixed_strength else weak,
        strong if mixed_strength else weak,
        weak,
        weak,
        weak,
        weak,
        strong if mixed_strength else weak,
        weak,
        strong if mixed_strength else weak,
        strong if mixed_strength else weak,
        weak,
    )
    rule_4_filter = "id<=100" if same_filter else "id<=80"
    rule_8_filter = "id<=100" if same_filter else "id>=100 and id<300"
    rule_10_filter = "id<=100" if same_filter else None
    return (
        fixed_rule(
            1,
            RuleCategory.COMPLETENESS,
            "空值数",
            operator=ComparisonOperator.NE,
            value="1",
            scope=RuleScope.FIELD,
            fields=("id", "age"),
            field_relation=LogicalRelation.AND,
            filter_expression="id<=100",
            strength=strengths[0],
        ),
        fixed_rule(
            2,
            RuleCategory.COMPLETENESS,
            "空值率",
            operator=ComparisonOperator.EQ,
            value="0",
            scope=RuleScope.FIELD,
            fields=("id", "age"),
            field_relation=LogicalRelation.OR,
            filter_expression=second_rule_filter,
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
            filter_expression="id<=100",
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
            filter_expression=rule_4_filter,
            strength=strengths[3],
        ),
        fixed_rule(
            5,
            RuleCategory.COMPLETENESS,
            "表行数",
            operator=ComparisonOperator.GT,
            value="0",
            scope=RuleScope.TABLE,
            filter_expression="id<=100",
            strength=strengths[4],
        ),
        fixed_rule(
            6,
            RuleCategory.COMPLETENESS,
            "字段取值校验",
            operator=ComparisonOperator.GE,
            value="1",
            scope=RuleScope.FIELD,
            fields=("string_num",),
            filter_expression="id<=100",
            strength=strengths[5],
            method=None,
        ),
        range_rule(
            7,
            field="id",
            first=(ComparisonOperator.GT, "0"),
            relation=LogicalRelation.AND,
            second=(ComparisonOperator.LE, "100"),
            filter_expression="id<=100",
            strength=strengths[6],
        ),
        fixed_rule(
            8,
            RuleCategory.VALIDITY,
            "数值-枚举个数",
            operator=ComparisonOperator.GE,
            value="1",
            fields=("string_num",),
            filter_expression=rule_8_filter,
            strength=strengths[7],
        ),
        enum_rule(
            9,
            field="age",
            operator=EnumOperator.NOT_IN,
            values=_DEFAULT_ENUM_VALUES,
            filter_expression="id<=100",
            strength=strengths[8],
        ),
        range_enum_rule(
            10,
            field="id",
            first=(ComparisonOperator.GT, "0"),
            range_relation=LogicalRelation.AND,
            second=(ComparisonOperator.LT, "5"),
            enum_operator=EnumOperator.IN,
            enum_values=("1",),
            relation=LogicalRelation.AND,
            filter_expression=rule_10_filter,
            strength=strengths[9],
        ),
        fixed_rule(
            11,
            RuleCategory.VALIDITY,
            "字符串长度",
            operator=ComparisonOperator.GE,
            value="1",
            fields=("address",),
            filter_expression="id<=100",
            strength=strengths[10],
        ),
        precision_rule(12, strength=strengths[11]),
        fixed_rule(
            13,
            RuleCategory.UNIQUENESS,
            "重复数",
            operator=ComparisonOperator.EQ,
            value="0",
            fields=("id",),
            filter_expression="id<=100",
        ),
        cross_table_unique_rule(14),
        fixed_rule(
            15,
            RuleCategory.STATISTICAL,
            "异常值检测",
            operator=ComparisonOperator.EQ,
            value="1",
            fields=("name",),
            filter_expression="id<=100",
            method="IQR离群点数量",
        ),
        custom_sql_rule(16),
        consistency_rule(17),
        periodic_rule(18),
        timeliness_rule(19),
        trend_rule(20),
        calculation_rule(21),
    )


def partial_merge_rules() -> tuple[RuleSpec, ...]:
    """Return the explicit 15-rule partially mergeable canonical family."""
    return (
        fixed_rule(
            1,
            RuleCategory.COMPLETENESS,
            "空值数",
            operator=ComparisonOperator.EQ,
            value="0",
            scope=RuleScope.FIELD,
            fields=("id",),
            filter_expression="id<=100",
        ),
        fixed_rule(
            2,
            RuleCategory.COMPLETENESS,
            "空串数",
            operator=ComparisonOperator.LE,
            value="0",
            scope=RuleScope.FIELD,
            fields=("name", "address"),
            field_relation=LogicalRelation.OR,
            filter_expression="id<=100",
        ),
        fixed_rule(
            3,
            RuleCategory.COMPLETENESS,
            "字段取值校验",
            operator=ComparisonOperator.GE,
            value="1",
            scope=RuleScope.FIELD,
            fields=("string_num",),
            filter_expression="id<=100",
            method=None,
        ),
        range_rule(
            4,
            field="id",
            first=(ComparisonOperator.GT, "20"),
            relation=LogicalRelation.AND,
            second=(ComparisonOperator.LT, "100"),
            filter_expression="id<=100",
            strength=RuleStrength.WEAK,
        ),
        fixed_rule(
            5,
            RuleCategory.VALIDITY,
            "数值-枚举个数",
            operator=ComparisonOperator.LT,
            value="2",
            fields=("string_num",),
            filter_expression="id<=100",
        ),
        fixed_rule(
            6,
            RuleCategory.VALIDITY,
            "字符串长度",
            operator=ComparisonOperator.GE,
            value="1",
            fields=("address",),
            filter_expression="id<=100",
        ),
        fixed_rule(
            7,
            RuleCategory.UNIQUENESS,
            "重复数",
            operator=ComparisonOperator.EQ,
            value="0",
            fields=("id",),
            filter_expression="id<=100",
        ),
        cross_table_unique_rule(8),
        fixed_rule(
            9,
            RuleCategory.STATISTICAL,
            "异常值检测",
            operator=ComparisonOperator.EQ,
            value="1",
            fields=("name",),
            filter_expression="id<=100",
            method="IQR离群点数量",
        ),
        custom_sql_rule(10),
        consistency_rule(11),
        periodic_rule(12),
        timeliness_rule(13),
        trend_rule(14),
        calculation_rule(15),
    )


def unmergeable_rules(*, include_string_length: bool) -> tuple[RuleSpec, ...]:
    """Return the explicit 12- or 13-rule non-mergeable canonical family."""
    rules: list[RuleSpec] = [
        fixed_rule(
            1,
            RuleCategory.COMPLETENESS,
            "字段取值校验",
            operator=ComparisonOperator.GE,
            value="1",
            scope=RuleScope.FIELD,
            fields=("string_num",),
            filter_expression="id<=100",
            method=None,
        ),
        table_row_compare_rule(2),
    ]
    next_index = 3
    if include_string_length:
        rules.append(
            fixed_rule(
                next_index,
                RuleCategory.VALIDITY,
                "字符串长度",
                operator=ComparisonOperator.GE,
                value="1",
                fields=("address",),
                filter_expression="id<=100",
            )
        )
        next_index += 1
    rules.extend(
        (
            precision_rule(next_index, strength=RuleStrength.WEAK),
            fixed_rule(
                next_index + 1,
                RuleCategory.UNIQUENESS,
                "重复数",
                operator=ComparisonOperator.EQ,
                value="0",
                fields=("id",),
                filter_expression="id<=100",
            ),
            cross_table_unique_rule(next_index + 2),
            fixed_rule(
                next_index + 3,
                RuleCategory.STATISTICAL,
                "异常值检测",
                operator=ComparisonOperator.EQ,
                value="1",
                fields=("name",),
                filter_expression="id<=100",
                method="IQR离群点数量",
            ),
            custom_sql_rule(next_index + 4),
            consistency_rule(next_index + 5),
            periodic_rule(next_index + 6),
            timeliness_rule(next_index + 7),
            trend_rule(next_index + 8),
            calculation_rule(next_index + 9),
        )
    )
    return tuple(rules)
