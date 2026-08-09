"""Composable constructors for explicit canonical SQL-merge rule specifications."""

from __future__ import annotations

from .rules import (
    CalculationSpec,
    ComparisonOperator,
    ConsistencySpec,
    CrossTableUniqueSpec,
    CustomSqlParameter,
    CustomSqlSpec,
    EnumOperator,
    EnumValueSpec,
    FixedValueSpec,
    LogicalRelation,
    NumericPredicate,
    NumericRangeSpec,
    ParameterValueKind,
    PrecisionSpec,
    RangeAndEnumSpec,
    RuleCategory,
    RulePackageSpec,
    RuleScope,
    RuleSetSpec,
    RuleSpec,
    RuleStrength,
    TableRowCountCompareSpec,
    TaskSpec,
    TimeDifferenceSpec,
    TrendSpec,
)


def fixed_rule(  # noqa: PLR0913
    index: int,
    category: RuleCategory,
    function_name: str,
    *,
    operator: ComparisonOperator,
    value: str,
    fields: tuple[str, ...] = (),
    scope: RuleScope | None = None,
    field_relation: LogicalRelation | None = None,
    filter_expression: str | None = None,
    strength: RuleStrength = RuleStrength.WEAK,
    method: str | None = "固定值",
) -> RuleSpec:
    """Construct one fixed-value rule without inferring case identity."""
    return RuleSpec(
        index=index,
        category=category,
        function_name=function_name,
        strength=strength,
        detail=FixedValueSpec(
            predicate=NumericPredicate(operator=operator, value=value),
            method=method,
        ),
        scope=scope,
        fields=fields,
        field_relation=field_relation,
        filter_expression=filter_expression,
    )


def range_rule(  # noqa: PLR0913
    index: int,
    *,
    field: str,
    first: tuple[ComparisonOperator, str],
    relation: LogicalRelation,
    second: tuple[ComparisonOperator, str],
    filter_expression: str | None,
    strength: RuleStrength,
) -> RuleSpec:
    """Construct one numeric-range validity rule."""
    return RuleSpec(
        index=index,
        category=RuleCategory.VALIDITY,
        function_name="数值-取值范围",
        fields=(field,),
        strength=strength,
        filter_expression=filter_expression,
        detail=NumericRangeSpec(
            first=NumericPredicate(operator=first[0], value=first[1]),
            relation=relation,
            second=NumericPredicate(operator=second[0], value=second[1]),
        ),
    )


def enum_rule(  # noqa: PLR0913
    index: int,
    *,
    field: str,
    operator: EnumOperator,
    values: tuple[str, ...],
    filter_expression: str | None,
    strength: RuleStrength,
) -> RuleSpec:
    """Construct one exact enum-membership rule."""
    return RuleSpec(
        index=index,
        category=RuleCategory.VALIDITY,
        function_name="枚举值",
        fields=(field,),
        strength=strength,
        filter_expression=filter_expression,
        detail=EnumValueSpec(operator=operator, values=values),
    )


def range_enum_rule(  # noqa: PLR0913
    index: int,
    *,
    field: str,
    first: tuple[ComparisonOperator, str],
    range_relation: LogicalRelation,
    second: tuple[ComparisonOperator, str],
    enum_operator: EnumOperator,
    enum_values: tuple[str, ...],
    relation: LogicalRelation,
    filter_expression: str | None,
    strength: RuleStrength,
) -> RuleSpec:
    """Construct one combined numeric-range and enum rule."""
    return RuleSpec(
        index=index,
        category=RuleCategory.VALIDITY,
        function_name="取值范围&枚举范围",
        fields=(field,),
        strength=strength,
        filter_expression=filter_expression,
        detail=RangeAndEnumSpec(
            numeric_range=NumericRangeSpec(
                first=NumericPredicate(operator=first[0], value=first[1]),
                relation=range_relation,
                second=NumericPredicate(operator=second[0], value=second[1]),
            ),
            enum_values=EnumValueSpec(operator=enum_operator, values=enum_values),
            relation=relation,
        ),
    )


def precision_rule(index: int, *, strength: RuleStrength) -> RuleSpec:
    """Construct the canonical money 4/1 precision rule."""
    return RuleSpec(
        index=index,
        category=RuleCategory.VALIDITY,
        function_name="数据精度",
        fields=("money",),
        filter_expression="id<=100",
        strength=strength,
        detail=PrecisionSpec(
            integer_digits=NumericPredicate(ComparisonOperator.EQ, "4"),
            relation=LogicalRelation.AND,
            fractional_digits=NumericPredicate(ComparisonOperator.EQ, "1"),
        ),
    )


def cross_table_unique_rule(index: int) -> RuleSpec:
    """Construct the canonical self-table uniqueness comparison."""
    return RuleSpec(
        index=index,
        category=RuleCategory.UNIQUENESS,
        function_name="多表唯一性判断",
        fields=("age",),
        filter_expression="id<=100",
        strength=RuleStrength.WEAK,
        detail=CrossTableUniqueSpec(
            comparison_relation=LogicalRelation.AND,
            compare_field="id",
        ),
    )


def table_row_compare_rule(index: int) -> RuleSpec:
    """Construct the canonical current-table row-count comparison."""
    return RuleSpec(
        index=index,
        category=RuleCategory.COMPLETENESS,
        function_name="多表数据行数对比",
        scope=RuleScope.TABLE,
        strength=RuleStrength.WEAK,
        detail=TableRowCountCompareSpec(),
    )


def custom_sql_rule(index: int) -> RuleSpec:
    """Construct the canonical selected-template custom SQL rule."""
    return RuleSpec(
        index=index,
        category=RuleCategory.CUSTOM_SQL,
        function_name="自定义规则测试",
        strength=RuleStrength.WEAK,
        detail=CustomSqlSpec(
            template_name="自定义规则测试",
            rule_family="完整性校验",
            sql_template="select * from ${tableName} where ${colName} = ${value}",
            parameters=(
                CustomSqlParameter("tableName", ParameterValueKind.CURRENT_TABLE),
                CustomSqlParameter("colName", ParameterValueKind.FIELD, "id"),
                CustomSqlParameter("value", ParameterValueKind.LITERAL, "1"),
            ),
            expected=FixedValueSpec(NumericPredicate(ComparisonOperator.EQ, "1")),
        ),
    )


def consistency_rule(index: int) -> RuleSpec:
    """Construct the canonical self-table id/name consistency comparison."""
    return RuleSpec(
        index=index,
        category=RuleCategory.CONSISTENCY,
        function_name="多表数据一致性比对",
        strength=RuleStrength.WEAK,
        detail=ConsistencySpec(
            main_fields=("id", "name"),
            main_key="id",
            compare_key="id",
            mappings=(("id", "id"), ("name", "name")),
        ),
    )


def periodic_rule(index: int) -> RuleSpec:
    """Construct the canonical single-field periodic time-difference rule."""
    return RuleSpec(
        index=index,
        category=RuleCategory.TIMELINESS,
        function_name="周期性校验（单字段时间差校验）",  # noqa: RUF001
        fields=("buy_date",),
        filter_expression="id<=100",
        strength=RuleStrength.WEAK,
        detail=TimeDifferenceSpec(
            order_field="id",
            compare_fields=(),
            predicate=NumericPredicate(ComparisonOperator.GE, "1"),
            unit="秒",
        ),
    )


def timeliness_rule(index: int) -> RuleSpec:
    """Construct the canonical multi-field timeliness rule."""
    return RuleSpec(
        index=index,
        category=RuleCategory.TIMELINESS,
        function_name="及时性校验（多字段时间差校验）",  # noqa: RUF001
        fields=("id",),
        filter_expression="id<=100",
        strength=RuleStrength.WEAK,
        detail=TimeDifferenceSpec(
            order_field=None,
            compare_fields=("buy_date", "dt"),
            predicate=NumericPredicate(ComparisonOperator.LT, "1"),
            unit="分钟",
            field_relation="buy_date<dt",
        ),
    )


def trend_rule(index: int) -> RuleSpec:
    """Construct the canonical monotonic-increase rule."""
    return RuleSpec(
        index=index,
        category=RuleCategory.REASONABLENESS,
        function_name="数据变化趋势",
        fields=("age",),
        filter_expression="id<=100",
        strength=RuleStrength.WEAK,
        detail=TrendSpec(order_field="id", method="单调递增"),
    )


def calculation_rule(index: int) -> RuleSpec:
    """Construct the canonical calculated-value comparison rule."""
    return RuleSpec(
        index=index,
        category=RuleCategory.REASONABLENESS,
        function_name="字段值计算对比",
        fields=("age",),
        filter_expression="id<=100",
        strength=RuleStrength.WEAK,
        detail=CalculationSpec(
            expression="cast(string_num as double)*(id+age)",
            method="计算结果与字段对比",
            compare_field="age",
            operator=ComparisonOperator.LT,
        ),
    )


def rule_set_spec(
    case_id: str,
    *,
    purpose: str,
    rules: tuple[RuleSpec, ...],
) -> RuleSetSpec:
    """Keep every canonical subrule in the one declared source rule package."""
    return RuleSetSpec(
        description_base=f"SQL合并{case_id}",
        source_packages=(
            RulePackageSpec(
                base_name=f"SQL{case_id}Source",
                purpose=purpose,
                rules=rules,
            ),
        ),
    )


def task_spec(
    case_id: str,
    *,
    merge_batch_size: int,
    sampling_percent: int | None,
    partition_filter: str | None,
    expected_generated_sql_package_count: int | None = None,
) -> TaskSpec:
    """Construct one collision-safe manual task without case behavior dispatch."""
    return TaskSpec(
        base_name=f"SQLTask{case_id}",
        merge_batch_size=merge_batch_size,
        sampling_percent=sampling_percent,
        partition_filter=partition_filter,
        report_name_base=f"SQLReport{case_id}",
        expected_generated_sql_package_count=expected_generated_sql_package_count,
    )
