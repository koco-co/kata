from __future__ import annotations

from copy import deepcopy
from typing import cast

import pytest

from data_assets_playwright_web_ui.domains.data_quality.sql_merge_optimization import (
    catalog_builders,
    rule_contract,
)
from data_assets_playwright_web_ui.domains.data_quality.sql_merge_optimization.rules import (
    ComparisonOperator,
    LogicalRelation,
    RuleCategory,
    RuleScope,
    RuleStrength,
    SourceRuleCardSpec,
)

RuleSemanticContractError = rule_contract.RuleSemanticContractError


def _fixed_payload() -> dict[str, object]:
    return {
        "type": 1,
        "level": 0,
        "functionId": 1,
        "columnName": ["id", "age"],
        "logic": "and",
        "filter": "id<=100",
        "filterConfigType": 0,
        "verifyType": 1,
        "operator": "!=",
        "threshold": "0",
        "ruleStrength": 1,
        "description": "SQLR01_a123",
    }


def test_fixed_rule_request_matches_every_typed_business_field() -> None:
    rule = catalog_builders.fixed_rule(
        1,
        RuleCategory.COMPLETENESS,
        "空值数",
        operator=ComparisonOperator.NE,
        value="0",
        scope=RuleScope.FIELD,
        fields=("id", "age"),
        field_relation=LogicalRelation.AND,
        filter_expression="id<=100",
    )

    fingerprint = rule_contract.assert_rule_payload_matches_spec(
        _fixed_payload(),
        rule=rule,
        description="SQLR01_a123",
    )

    assert dict(fingerprint.fields)["operator"] == '"!="'


@pytest.mark.parametrize(
    ("field", "mutated"),
    [
        ("type", 3),
        ("level", 1),
        ("columnName", ["id", "name"]),
        ("logic", "or"),
        ("filter", "id<100"),
        ("filterConfigType", 1),
        ("verifyType", 7),
        ("operator", "="),
        ("threshold", "1"),
        ("ruleStrength", 2),
        ("description", "wrong"),
    ],
)
def test_fixed_rule_request_rejects_each_semantic_mutation(
    field: str,
    mutated: object,
) -> None:
    rule = catalog_builders.fixed_rule(
        1,
        RuleCategory.COMPLETENESS,
        "空值数",
        operator=ComparisonOperator.NE,
        value="0",
        scope=RuleScope.FIELD,
        fields=("id", "age"),
        field_relation=LogicalRelation.AND,
        filter_expression="id<=100",
    )
    payload = _fixed_payload()
    payload[field] = mutated

    with pytest.raises(RuleSemanticContractError):
        rule_contract.assert_rule_payload_matches_spec(
            payload,
            rule=rule,
            description="SQLR01_a123",
        )


def test_persisted_fingerprint_rejects_mutated_special_expansion() -> None:
    submitted_payload: dict[str, object] = {
        "type": 7,
        "level": 4,
        "functionId": 55,
        "columnName": ["id", "name"],
        "description": "SQLR17_a123",
        "ruleStrength": 1,
        "expansion": '{"verifyTables":[{"schemaName":"quality","tableName":"cmp_a"}]}',
        "compareTables": [{"columnName": "id", "verifyColumn": "id"}],
    }
    persisted_payload = deepcopy(submitted_payload)
    persisted_payload["functionId"] = "55"
    submitted = rule_contract.fingerprint_rule_payload(submitted_payload)
    persisted = rule_contract.fingerprint_rule_payload(persisted_payload)
    rule_contract.assert_persisted_fingerprint(submitted=submitted, persisted=persisted)

    persisted_payload["expansion"] = (
        '{"verifyTables":[{"schemaName":"quality","tableName":"wrong"}]}'
    )
    with pytest.raises(RuleSemanticContractError, match="complete submitted"):
        rule_contract.assert_persisted_fingerprint(
            submitted=submitted,
            persisted=rule_contract.fingerprint_rule_payload(persisted_payload),
        )


def test_unsupported_special_rule_fails_before_weak_request_acceptance() -> None:
    rule = catalog_builders.custom_sql_rule(1)
    payload: dict[str, object] = {
        "type": 5,
        "level": 1,
        "functionId": 99,
        "columnName": [],
        "ruleStrength": 1,
        "description": "custom",
    }

    with pytest.raises(RuleSemanticContractError, match="does not support"):
        rule_contract.assert_rule_payload_matches_spec(
            payload,
            rule=rule,
            description="custom",
        )


def _normative_card() -> SourceRuleCardSpec:
    return SourceRuleCardSpec(
        category=RuleCategory.VALIDITY,
        rules=(
            catalog_builders.range_rule(
                1,
                field="id",
                first=(ComparisonOperator.GT, "0"),
                relation=LogicalRelation.AND,
                second=(ComparisonOperator.LE, "100"),
                filter_expression="id<=100",
                strength=RuleStrength.WEAK,
            ),
            catalog_builders.fixed_rule(
                2,
                RuleCategory.VALIDITY,
                "数值-枚举个数",
                operator=ComparisonOperator.GE,
                value="1",
                fields=("id",),
                filter_expression="id<=80",
            ),
        ),
    )


def _normative_payload() -> dict[str, object]:
    return {
        "type": 3,
        "columnName": "id",
        "ruleStrength": 1,
        "description": "SQLCard01_a123",
        "isStandard": 0,
        "standardRuleList": [
            {
                "functionId": "25",
                "firstOperator": ">",
                "firstThreshold": "0",
                "condition": "AND",
                "secondOperator": "<=",
                "secondThreshold": "100",
                "filterConfigType": 0,
                "filter": "id<=100",
            },
            {
                "functionId": "12",
                "verifyType": 1,
                "operator": ">=",
                "threshold": "1",
                "filterConfigType": 0,
                "filter": "id<=80",
            },
        ],
    }


def test_normative_parent_card_matches_each_nested_executable_rule() -> None:
    fingerprints = rule_contract.assert_rule_card_payload_matches_spec(
        _normative_payload(),
        card=_normative_card(),
        description="SQLCard01_a123",
    )

    assert set(fingerprints) == {1, 2}
    assert dict(fingerprints[1].fields)["functionId"] == "25"
    assert dict(fingerprints[2].fields)["filter"] == '"id<=80"'


def test_normative_parent_rejects_root_level_executable_semantics() -> None:
    payload = _normative_payload()
    payload["functionId"] = 25

    with pytest.raises(RuleSemanticContractError, match="nested"):
        rule_contract.assert_rule_card_payload_matches_spec(
            payload,
            card=_normative_card(),
            description="SQLCard01_a123",
        )


def test_normative_parent_rejects_mutated_nested_threshold() -> None:
    payload = _normative_payload()
    children = payload["standardRuleList"]
    assert isinstance(children, list)
    child = cast("dict[str, object]", children[1])
    child["threshold"] = "2"

    with pytest.raises(RuleSemanticContractError, match="threshold"):
        rule_contract.assert_rule_card_payload_matches_spec(
            payload,
            card=_normative_card(),
            description="SQLCard01_a123",
        )
