"""Rule-by-rule UI provisioning driven by typed canonical specifications."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

from playwright.sync_api import expect

from .form_controls import ExactFormControls
from .rules import (
    CalculationSpec,
    ConsistencySpec,
    CrossTableUniqueSpec,
    CustomSqlSpec,
    EnumValueSpec,
    FixedValueSpec,
    LogicalRelation,
    NumericPredicate,
    NumericRangeSpec,
    PrecisionSpec,
    RangeAndEnumSpec,
    RuleCategory,
    RuleDetail,
    RuleSpec,
    SourceRuleCardSpec,
    TableRowCountCompareSpec,
    TimeDifferenceSpec,
    TrendSpec,
)
from .screen_base import UI_TIMEOUT_MS, SqlMergeUiError

_TWO_CONTROLS = 2
_THREE_CONTROLS = 3

if TYPE_CHECKING:
    from playwright.sync_api import Locator, Page


@dataclass(frozen=True, slots=True)
class TypedRuleEditor:
    """Add and configure one explicit rule inside a scoped rule-set package."""

    page: Page

    @property
    def controls(self) -> ExactFormControls:
        """Return stateless exact form controls for the current page."""
        return ExactFormControls(self.page)

    def add(self, package: Locator, *, card: SourceRuleCardSpec, description: str) -> None:
        """Append one parent card and configure its independently persisted children."""
        forms = package.locator(".ruleSetMonitor__ruleList .ruleForm")
        before = forms.count()
        add = package.get_by_role("button", name="添加规则", exact=True)
        expect(add, "规则包必须提供添加规则入口").to_be_enabled(timeout=UI_TIMEOUT_MS)
        add.click()
        menu = self.page.locator(".ant-dropdown:visible, .ant-popover:visible").last
        expect(menu, "添加规则必须展示规则类型菜单").to_be_visible(timeout=UI_TIMEOUT_MS)
        option = menu.get_by_text(card.category.value, exact=True)
        if option.count() != 1:
            message = f"当前部署未唯一提供规则类型“{card.category.value}”"
            raise SqlMergeUiError(message)
        option.click()
        expect(forms, "添加规则必须只新增一个可配置 ruleForm").to_have_count(
            before + 1,
            timeout=UI_TIMEOUT_MS,
        )
        form = forms.nth(before)
        first_index = card.rules[0].index
        expect(form, f"规则卡 {first_index} 表单必须可见").to_be_visible(timeout=UI_TIMEOUT_MS)
        if card.category is RuleCategory.VALIDITY:
            self._configure_normative_card(form, card=card, description=description)
        else:
            rule = card.rules[0]
            self._configure_common(form, rule=rule, description=description)
            self._configure_detail(form, rule=rule)
        expect(
            self.controls.item(form, "规则描述").locator(
                "input:not(.ant-select-selection-search-input):visible, textarea:visible"
            ),
            f"规则卡 {first_index} 必须保留唯一规则描述",
        ).to_have_value(description, timeout=UI_TIMEOUT_MS)

    def _configure_normative_card(
        self,
        root: Locator,
        *,
        card: SourceRuleCardSpec,
        description: str,
    ) -> None:
        self.controls.select(root, label="字段", value=card.fields[0], index=-1)
        standard_item = root.locator(".ant-form-item:visible").filter(
            has=root.get_by_text("是否引用标准规则", exact=True)
        )
        if standard_item.count() > 1:
            message = "规范性父卡不得出现多个引用标准规则控件"
            raise SqlMergeUiError(message)
        if standard_item.count() == 1:
            self.controls.choose(root, label="是否引用标准规则", value="不引用")
        rows = root.locator(".rule__function-list__item:visible")
        expect(rows, "规范性规则卡必须默认提供一个统计规则行").to_have_count(
            1,
            timeout=UI_TIMEOUT_MS,
        )
        for position, rule in enumerate(card.rules):
            if position > 0:
                add = root.locator(
                    ".rule__function-list__fixed-action:visible button.ant-btn:visible"
                ).last
                expect(add, "规范性统计规则列表必须提供新增行入口").to_be_enabled(
                    timeout=UI_TIMEOUT_MS
                )
                add.click()
                expect(rows, "新增统计规则必须只增加一个嵌套行").to_have_count(
                    position + 1,
                    timeout=UI_TIMEOUT_MS,
                )
            self._configure_normative_child(rows.nth(position), rule=rule)
        self.controls.select(root, label="强弱规则", value=card.strength.value, index=-1)
        self.controls.fill(root, label="规则描述", value=description, index=-1)

    def _configure_normative_child(self, row: Locator, *, rule: RuleSpec) -> None:
        selectors = row.locator(".ant-select:visible")
        if selectors.count() < 1:
            message = "规范性统计规则行必须提供统计函数控件"
            raise SqlMergeUiError(message)
        self.controls.select_control(
            selectors.first,
            value=rule.function_name,
            label="统计规则",
        )
        detail = rule.detail
        if isinstance(detail, FixedValueSpec):
            self._configure_nested_fixed(row, detail)
        elif isinstance(detail, NumericRangeSpec):
            self._configure_nested_range(row, detail)
        elif isinstance(detail, EnumValueSpec):
            self._configure_nested_enum(row, detail)
        elif isinstance(detail, PrecisionSpec):
            self._configure_nested_precision(row, detail)
        else:
            message = "当前规范性嵌套规则没有 source-backed UI editor"
            raise SqlMergeUiError(message)
        self._configure_nested_filter(row, expression=rule.filter_expression)

    def _configure_nested_fixed(self, row: Locator, detail: FixedValueSpec) -> None:
        selectors = row.locator(".ant-select:visible")
        if detail.method != "固定值" or selectors.count() < _THREE_CONTROLS:
            message = "规范性固定值规则必须提供校验方法和期望值操作符"
            raise SqlMergeUiError(message)
        self.controls.select_control(selectors.nth(1), value="固定值", label="校验方法")
        selectors = row.locator(".ant-select:visible")
        self.controls.select_control(
            selectors.nth(2),
            value=detail.predicate.operator.value,
            label="期望值",
        )
        inputs = self._nested_inputs(row)
        self.controls.fill_control(
            inputs.first,
            value=detail.predicate.value,
            label="期望值",
        )

    def _configure_nested_range(self, row: Locator, detail: NumericRangeSpec) -> None:
        selectors = row.locator(".ant-select:visible")
        if selectors.count() < _TWO_CONTROLS:
            message = "规范性取值范围必须提供第一操作符"
            raise SqlMergeUiError(message)
        self.controls.select_control(
            selectors.nth(1),
            value=detail.first.operator.value,
            label="取值范围",
        )
        inputs = self._nested_inputs(row)
        self.controls.fill_control(inputs.first, value=detail.first.value, label="取值范围")
        if detail.second is None or detail.relation is None:
            return
        relation = row.get_by_text(detail.relation.value, exact=True)
        expect(relation, "双边取值范围必须提供精确关系控件").to_have_count(
            1,
            timeout=UI_TIMEOUT_MS,
        )
        relation.click()
        selectors = row.locator(".ant-select:visible")
        if selectors.count() < _THREE_CONTROLS:
            message = "规范性双边取值范围必须提供第二操作符"
            raise SqlMergeUiError(message)
        self.controls.select_control(
            selectors.nth(2),
            value=detail.second.operator.value,
            label="取值范围",
        )
        inputs = self._nested_inputs(row)
        if inputs.count() < _TWO_CONTROLS:
            message = "规范性双边取值范围必须提供第二阈值"
            raise SqlMergeUiError(message)
        self.controls.fill_control(inputs.nth(1), value=detail.second.value, label="取值范围")

    def _configure_nested_enum(self, row: Locator, detail: EnumValueSpec) -> None:
        selectors = row.locator(".ant-select:visible")
        if selectors.count() < _TWO_CONTROLS:
            message = "规范性枚举规则必须提供枚举值 tags 控件"
            raise SqlMergeUiError(message)
        selector = selectors.nth(1)
        search = selector.locator("input.ant-select-selection-search-input")
        expect(search, "枚举值控件必须允许逐值输入").to_have_count(1, timeout=UI_TIMEOUT_MS)
        for value in detail.values:
            search.fill(value)
            search.press("Enter")
            expect(selector.get_by_text(value, exact=True)).to_be_visible(timeout=UI_TIMEOUT_MS)

    def _configure_nested_precision(self, row: Locator, detail: PrecisionSpec) -> None:
        selectors = row.locator(".ant-select:visible")
        inputs = self._nested_inputs(row)
        if selectors.count() < _THREE_CONTROLS or inputs.count() < _TWO_CONTROLS:
            message = "规范性数据精度必须提供两组精确位数控件"
            raise SqlMergeUiError(message)
        self.controls.select_control(
            selectors.nth(1), value=detail.integer_digits.operator.value, label="数据精度"
        )
        self.controls.fill_control(
            inputs.nth(0), value=detail.integer_digits.value, label="数据精度"
        )
        relation = row.get_by_text(detail.relation.value, exact=True)
        expect(relation, "数据精度必须提供精确关系控件").to_have_count(
            1,
            timeout=UI_TIMEOUT_MS,
        )
        relation.click()
        self.controls.select_control(
            selectors.nth(2), value=detail.fractional_digits.operator.value, label="数据精度"
        )
        self.controls.fill_control(
            inputs.nth(1), value=detail.fractional_digits.value, label="数据精度"
        )

    def _configure_nested_filter(self, row: Locator, *, expression: str | None) -> None:
        if expression is None:
            return
        root = row.locator(".filterCondition--inline:visible")
        expect(root, "规范性统计规则必须展示行内过滤条件").to_have_count(
            1,
            timeout=UI_TIMEOUT_MS,
        )
        selector = root.locator(".ant-select:visible")
        expect(selector, "行内过滤条件必须展示配置方式").to_have_count(
            1,
            timeout=UI_TIMEOUT_MS,
        )
        self.controls.select_control(selector, value="手动配置", label="过滤条件")
        control = root.locator(
            "input:not(.ant-select-selection-search-input):visible, textarea:visible"
        )
        expect(control, "手动过滤条件必须展示唯一输入框").to_have_count(
            1,
            timeout=UI_TIMEOUT_MS,
        )
        self.controls.fill_control(control, value=expression, label="过滤条件")

    @staticmethod
    def _nested_inputs(row: Locator) -> Locator:
        return row.locator(
            "xpath=.//input[not(@type='hidden') and "
            "not(contains(@class,'ant-select-selection-search-input')) and "
            "not(ancestor::*[contains(@class,'filterCondition')])] | "
            ".//textarea[not(ancestor::*[contains(@class,'filterCondition')])]"
        )

    def _configure_common(self, root: Locator, *, rule: RuleSpec, description: str) -> None:
        if rule.scope is not None:
            self.controls.select(
                root,
                label="生效范围",
                value=rule.scope.value,
                index=-1,
            )
        if rule.fields:
            self.controls.select_many(root, label="字段", values=rule.fields)
        if rule.field_relation is not None:
            relation = "and" if rule.field_relation is LogicalRelation.AND else "or"
            self.controls.select(root, label="字段间规则逻辑", value=relation, index=-1)
        self.controls.select(root, label="统计函数", value=rule.function_name, index=-1)
        if rule.filter_expression is not None:
            self.controls.select(
                root,
                label="过滤条件",
                value="手动配置",
                index=-1,
            )
            self.controls.fill(
                root,
                label="过滤条件",
                value=rule.filter_expression,
                index=-1,
            )
        self.controls.select(root, label="强弱规则", value=rule.strength.value, index=-1)
        self.controls.fill(root, label="规则描述", value=description, index=-1)

    def _configure_detail(self, root: Locator, *, rule: RuleSpec) -> None:
        detail = rule.detail
        if isinstance(
            detail,
            (FixedValueSpec, NumericRangeSpec, EnumValueSpec, RangeAndEnumSpec, PrecisionSpec),
        ):
            self._configure_value_detail(root, detail)
            return
        self._configure_special_detail(root, detail)

    def _configure_value_detail(
        self,
        root: Locator,
        detail: FixedValueSpec
        | NumericRangeSpec
        | EnumValueSpec
        | RangeAndEnumSpec
        | PrecisionSpec,
    ) -> None:
        if isinstance(detail, FixedValueSpec):
            if detail.method is not None:
                self.controls.select(root, label="校验方法", value=detail.method, index=-1)
            self._predicate_group(root, label="期望值", predicates=(detail.predicate,))
        elif isinstance(detail, NumericRangeSpec):
            predicates = (detail.first,) if detail.second is None else (detail.first, detail.second)
            self._predicate_group(
                root,
                label="期望值",
                predicates=predicates,
                relation=detail.relation,
            )
        elif isinstance(detail, EnumValueSpec):
            self._enum_group(root, label="期望值", detail=detail)
        elif isinstance(detail, RangeAndEnumSpec):
            predicates = (detail.numeric_range.first, detail.numeric_range.second)
            if predicates[1] is None:
                message = "取值范围与枚举规则必须完整配置双边范围"
                raise ValueError(message)
            self._predicate_group(
                root,
                label="取值范围",
                predicates=(predicates[0], predicates[1]),
                relation=detail.numeric_range.relation,
            )
            self._enum_group(root, label="枚举值", detail=detail.enum_values)
            self.controls.choose(
                root,
                label="取值范围和枚举值关系",
                value=detail.relation.value,
            )
        else:
            self._predicate_group(
                root,
                label="小数点前最大位",
                predicates=(detail.integer_digits,),
            )
            self._predicate_group(
                root,
                label="小数点后最大位",
                predicates=(detail.fractional_digits,),
            )
            self.controls.choose(root, label="精度关系", value=detail.relation.value)

    def _configure_special_detail(self, root: Locator, detail: RuleDetail) -> None:
        if isinstance(detail, CrossTableUniqueSpec):
            self.controls.choose(root, label="校验字段逻辑", value=detail.field_logic)
            self.controls.choose(
                root,
                label="和其他表的校验关系",
                value=detail.comparison_relation.value,
            )
            self.controls.select(root, label="对比表字段", value=detail.compare_field, index=-1)
        elif isinstance(detail, TableRowCountCompareSpec):
            self.controls.choose(root, label="对比数据库", value="当前数据库")
            self.controls.choose(root, label="对比表", value="当前表")
        elif isinstance(detail, CustomSqlSpec):
            self._configure_custom_sql(root, detail)
        elif isinstance(detail, ConsistencySpec):
            self._configure_consistency(root, detail)
        elif isinstance(detail, TimeDifferenceSpec):
            self._configure_time_difference(root, detail)
        elif isinstance(detail, TrendSpec):
            self.controls.select(root, label="排序字段", value=detail.order_field, index=-1)
            self.controls.select(root, label="校验方法", value=detail.method, index=-1)
        elif isinstance(detail, CalculationSpec):
            self.controls.fill(root, label="计算表达式", value=detail.expression, index=-1)
            self.controls.select(root, label="校验方法", value=detail.method, index=-1)
            self.controls.select(root, label="对比字段", value=detail.compare_field, index=-1)
            self.controls.select(root, label="操作符", value=detail.operator.value, index=-1)
        else:
            message = "当前 typed rule detail 没有 UI provisioning 实现"
            raise SqlMergeUiError(message)

    def _predicate_group(
        self,
        root: Locator,
        *,
        label: str,
        predicates: tuple[NumericPredicate, ...],
        relation: LogicalRelation | None = None,
    ) -> None:
        group = self._labeled_group(root, label)
        selectors = group.locator(".ant-select:visible")
        inputs = group.locator(
            "input:not(.ant-select-selection-search-input):visible, textarea:visible"
        )
        if selectors.count() < len(predicates) or inputs.count() < len(predicates):
            message = f"表单项“{label}”不具备完整数值条件控件"
            raise SqlMergeUiError(message)
        for index, predicate in enumerate(predicates):
            self.controls.select_control(
                selectors.nth(index),
                value=predicate.operator.value,
                label=label,
            )
            self.controls.fill_control(inputs.nth(index), value=predicate.value, label=label)
        if relation is not None:
            relation_control = group.get_by_text(relation.value, exact=True)
            expect(
                relation_control, f"表单项“{label}”必须展示关系“{relation.value}”"
            ).to_have_count(
                1,
                timeout=UI_TIMEOUT_MS,
            )
            relation_control.click()

    def _enum_group(self, root: Locator, *, label: str, detail: EnumValueSpec) -> None:
        group = self._labeled_group(root, label)
        selector = group.locator(".ant-select:visible").first
        values = group.locator(
            "input:not(.ant-select-selection-search-input):visible, textarea:visible"
        ).last
        self.controls.select_control(selector, value=detail.operator.value, label=label)
        self.controls.fill_control(values, value=",".join(detail.values), label=label)

    def _configure_custom_sql(self, root: Locator, detail: CustomSqlSpec) -> None:
        self.controls.select(root, label="自定义规则", value=detail.template_name, index=-1)
        self.controls.expect_text(root, label="规则分类", value=detail.rule_family)
        self.controls.expect_text(root, label="SQL模板", value=detail.sql_template)
        for parameter in detail.parameters:
            if parameter.value is not None:
                self.controls.fill(
                    root,
                    label=parameter.name,
                    value=parameter.value,
                    index=-1,
                )
        self._predicate_group(root, label="期望值", predicates=(detail.expected.predicate,))

    def _configure_consistency(self, root: Locator, detail: ConsistencySpec) -> None:
        self.controls.select_many(root, label="主表字段", values=detail.main_fields)
        self.controls.select(root, label="主表关联字段", value=detail.main_key, index=-1)
        self.controls.select(root, label="对比表关联字段", value=detail.compare_key, index=-1)
        for source, target in detail.mappings:
            self.controls.select(root, label=f"映射字段 {source}", value=target, index=-1)

    def _configure_time_difference(self, root: Locator, detail: TimeDifferenceSpec) -> None:
        if detail.order_field is not None:
            self.controls.select(root, label="排序字段", value=detail.order_field, index=-1)
        if detail.compare_fields:
            self.controls.select_many(root, label="对比字段", values=detail.compare_fields)
        if detail.field_relation is not None:
            self.controls.fill(root, label="字段关系", value=detail.field_relation, index=-1)
        self._predicate_group(root, label="期望值", predicates=(detail.predicate,))
        self.controls.select(root, label="时间单位", value=detail.unit, index=-1)

    @staticmethod
    def _labeled_group(root: Locator, label: str) -> Locator:
        label_node = root.get_by_text(label, exact=True).last
        expect(label_node, f"规则配置必须展示“{label}”").to_be_visible(timeout=UI_TIMEOUT_MS)
        return label_node.locator(
            "xpath=ancestor::*[contains(concat(' ', normalize-space(@class), ' '), ' ant-col ')][1]"
        )
