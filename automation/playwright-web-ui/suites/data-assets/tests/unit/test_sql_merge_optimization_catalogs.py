from __future__ import annotations

from dataclasses import replace

import pytest

from data_assets_playwright_web_ui.domains.data_quality.sql_merge_optimization.catalog_builders import (  # noqa: E501
    rule_set_spec,
    task_spec,
)
from data_assets_playwright_web_ui.domains.data_quality.sql_merge_optimization.combined_rule_catalog import (  # noqa: E501
    CombinedRuleProfile,
    combined_rules,
)
from data_assets_playwright_web_ui.domains.data_quality.sql_merge_optimization.completeness_rule_catalog import (  # noqa: E501
    CompletenessRuleProfile,
    completeness_rules,
)
from data_assets_playwright_web_ui.domains.data_quality.sql_merge_optimization.complex_rule_catalog import (  # noqa: E501
    mixed_rules,
)
from data_assets_playwright_web_ui.domains.data_quality.sql_merge_optimization.model import (
    FieldShape,
    MergeMode,
    RuleResultExpectation,
    SqlTopologyExpectation,
    WriteScenario,
)
from data_assets_playwright_web_ui.domains.data_quality.sql_merge_optimization.rules import (
    EnumValueSpec,
    FixedValueSpec,
    LogicalRelation,
    NumericRangeSpec,
    RangeAndEnumSpec,
    RuleEditorContractBlockedError,
    RulePackageSpec,
    RuleSetProvisioningBlockedError,
    RuleSetSpec,
    RuleStrength,
)
from data_assets_playwright_web_ui.domains.data_quality.sql_merge_optimization.validity_rule_catalog import (  # noqa: E501
    ValidityRuleProfile,
    validity_rules,
)
from playwright_web_ui.manifest import CaseKey
from playwright_web_ui.runtime_identity import AutomationRuntimeIdentity

_COMBINED_RULE_COUNT = 10
_MIXED_RULE_COUNT = 21
_SOURCE_PACKAGE_COUNT = 1
_C0014_SOURCE_CARD_COUNT = 5
_C0019_SOURCE_CARD_COUNT = 3


def _identity() -> AutomationRuntimeIdentity:
    return AutomationRuntimeIdentity(
        case=CaseKey(
            project_id="data-assets",
            feature_id="quality-rule-sql-merge-optimization",
            case_id="C0001",
        ),
        logical_run_id="20260809-1700-preflight-01",
        execution_id="execution-01",
        executor_id="playwright-web-ui",
        attempt=1,
        worker_id="serial",
    )


def test_21_top_level_rule_cards_remain_one_supported_source_package() -> None:
    rules = mixed_rules(
        same_filter=False,
        mixed_strength=True,
        second_rule_filter="id<=100",
    )

    rule_set = rule_set_spec(
        "C0001",
        purpose="mixed SQL topology",
        rules=rules,
    )

    assert tuple(len(package.rules) for package in rule_set.source_packages) == (21,)
    assert tuple(rule.index for rule in rule_set.rules) == tuple(range(1, 22))
    assert rule_set.rules[11].function_name == "数据精度"

    assert len(rule_set.source_cards) == _MIXED_RULE_COUNT
    rule_set.require_current_ui_compatible()


def test_ui_contract_blocks_only_oversized_nested_normative_list() -> None:
    template = validity_rules(ValidityRuleProfile.MIXED)[0]
    rules = tuple(
        replace(template, index=index, function_name=f"nested-{index}") for index in range(1, 12)
    )
    rule_set = RuleSetSpec(
        description_base="nested validity limit",
        source_packages=(
            RulePackageSpec(
                base_name="nested validity package",
                purpose="prove nested standard-rule boundary",
                rules=rules,
            ),
        ),
    )

    with pytest.raises(
        RuleSetProvisioningBlockedError,
        match="SQL_MERGE_NORMATIVE_CHILD_LIMIT",
    ):
        rule_set.require_current_ui_compatible()


def test_editor_capability_blocks_one_unverified_nested_detail_before_mutation() -> None:
    supported = rule_set_spec(
        "C0027",
        purpose="completeness SQL topology",
        rules=completeness_rules(CompletenessRuleProfile.MULTI_MIXED),
    )
    blocked = rule_set_spec(
        "C0019",
        purpose="nested normative SQL topology",
        rules=validity_rules(ValidityRuleProfile.MIXED),
    )

    supported.require_source_backed_editor()
    with pytest.raises(
        RuleEditorContractBlockedError,
        match="SQL_MERGE_RULE_EDITOR_CONTRACT_UNSUPPORTED",
    ):
        blocked.require_source_backed_editor()


def test_source_card_count_groups_normative_children_by_parent_fields() -> None:
    c0014 = rule_set_spec(
        "C0014",
        purpose="combined source-card topology",
        rules=combined_rules(CombinedRuleProfile.STRING_TO_INT),
    )
    c0019 = rule_set_spec(
        "C0019",
        purpose="validity source-card topology",
        rules=validity_rules(ValidityRuleProfile.MIXED),
    )

    assert len(c0014.source_cards) == _C0014_SOURCE_CARD_COUNT
    assert tuple(len(card.rules) for card in c0014.source_cards) == (1, 1, 1, 1, 4)
    assert len(c0019.source_cards) == _C0019_SOURCE_CARD_COUNT
    assert tuple(tuple(rule.index for rule in card.rules) for card in c0019.source_cards) == (
        (1, 4),
        (2,),
        (3,),
    )


def test_mixed_strength_combined_profile_preserves_exact_membership() -> None:
    rules = combined_rules(CombinedRuleProfile.MIXED_STRENGTH, include_string_length=True)

    assert len(rules) == _COMBINED_RULE_COUNT
    assert tuple(rule.index for rule in rules if rule.strength is RuleStrength.STRONG) == (
        2,
        3,
        7,
        9,
        10,
    )
    assert tuple(rule.index for rule in rules if rule.strength is RuleStrength.WEAK) == (
        1,
        4,
        5,
        6,
        8,
    )


def test_different_filter_combined_profile_does_not_invent_missing_filters() -> None:
    rules = combined_rules(CombinedRuleProfile.DIFFERENT_FILTERS)

    assert tuple(rule.filter_expression for rule in rules) == (
        "id<=100",
        "id<=80",
        "id<=10",
        None,
        "id<=100",
        "id<=100",
        "id<=80",
        "id<=70",
        None,
    )


def test_string_to_int_profiles_keep_case_specific_combined_range_field() -> None:
    c0014 = combined_rules(CombinedRuleProfile.STRING_TO_INT)
    c0050 = combined_rules(CombinedRuleProfile.STRING_TO_INT_ID_RANGE)

    assert c0014[7].fields == ("string_num",)
    assert c0050[7].fields == ("id",)


def test_mixed_profile_requires_case_specific_second_rule_filter() -> None:
    c0001 = mixed_rules(
        same_filter=False,
        mixed_strength=True,
        second_rule_filter="id<=100",
    )
    c0037 = mixed_rules(
        same_filter=False,
        mixed_strength=True,
        second_rule_filter=None,
    )

    assert c0001[1].filter_expression == "id<=100"
    assert c0037[1].filter_expression is None


def test_passing_validity_profile_keeps_or_range_and_not_in_zero() -> None:
    rules = validity_rules(ValidityRuleProfile.ALL_PASSED)
    enum_detail = rules[2].detail
    combined_detail = rules[3].detail

    assert isinstance(enum_detail, EnumValueSpec)
    assert enum_detail.values == ("25", "30", "28", "35", "22", "29", "34", "20", "18")
    assert isinstance(combined_detail, RangeAndEnumSpec)
    assert combined_detail.numeric_range.relation is LogicalRelation.OR
    assert combined_detail.enum_values.values == ("0",)


@pytest.mark.parametrize(
    ("profile", "count", "first_value", "third_value", "fifth_value"),
    [
        (CompletenessRuleProfile.MULTI_MIXED, 6, "1", "100", "0"),
        (CompletenessRuleProfile.SINGLE_MIXED, 6, "0", "0", "0"),
        (CompletenessRuleProfile.MULTI_UNPASSED, 5, "1", "100", "0"),
        (CompletenessRuleProfile.MULTI_PASSED, 5, "1", "0", "0"),
        (CompletenessRuleProfile.SINGLE_UNPASSED, 5, "10", "0", "0"),
        (CompletenessRuleProfile.SINGLE_PASSED, 5, "0", "1", "0"),
        (CompletenessRuleProfile.SINGLE_FULL_UNPASSED, 5, "0", "1", "0"),
        (CompletenessRuleProfile.SINGLE_FULL_PASSED, 5, "0", "0", "0"),
    ],
)
def test_completeness_profiles_keep_exact_shape_and_predicates(
    profile: CompletenessRuleProfile,
    count: int,
    first_value: str,
    third_value: str,
    fifth_value: str,
) -> None:
    rules = completeness_rules(profile)

    assert len(rules) == count
    for rule, value in ((rules[0], first_value), (rules[2], third_value), (rules[4], fifth_value)):
        assert isinstance(rule.detail, FixedValueSpec)
        assert rule.detail.predicate.value == value


def test_materialized_names_are_unique_and_keep_every_rule_identity() -> None:
    rules = mixed_rules(
        same_filter=False,
        mixed_strength=True,
        second_rule_filter="id<=100",
    )
    rule_set = rule_set_spec(
        "C0001",
        purpose="mixed SQL topology",
        rules=rules,
    )
    task = task_spec(
        "C0001",
        merge_batch_size=10,
        sampling_percent=50,
        partition_filter="dt=2026-08-04",
        expected_generated_sql_package_count=10,
    )
    scenario = WriteScenario(
        case_id="C0001",
        table_name="test_table_15862_c0001",
        task_name="RuleA",
        rule_package_name="mixed SQL topology",
        rule_functions=tuple(rule.function_name for rule in rules),
        field_shape=FieldShape.MIXED,
        merge_batch_size=10,
        topology=SqlTopologyExpectation(
            mode=MergeMode.PARTIAL,
            merged_rule_groups=((1, 5, 7, 9), (2, 10, 11)),
            isolated_rules=(3, 4, 6, 8, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21),
            sampling_percent=50,
            partition_filter="dt=2026-08-04",
        ),
        result=RuleResultExpectation(),
        rule_set=rule_set,
        task=task,
    )

    names = scenario.materialize_names(_identity())

    assert len(names.package_names) == _SOURCE_PACKAGE_COUNT
    assert len(names.rule_descriptions) == _MIXED_RULE_COUNT
    assert len(set(names.rule_descriptions)) == _MIXED_RULE_COUNT
    assert all(name.endswith(_identity().collision_token) for name in names.rule_descriptions)


def test_validity_range_profile_has_typed_numeric_detail() -> None:
    rules = validity_rules(ValidityRuleProfile.ALL_UNPASSED)

    assert isinstance(rules[0].detail, NumericRangeSpec)
    assert rules[0].detail.first.value == "20"
