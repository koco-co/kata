"""Exact rule request and persistence fingerprints for controlled provisioning."""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import TYPE_CHECKING, Final, Never, cast

from .rules import (
    EnumOperator,
    EnumValueSpec,
    FixedValueSpec,
    LogicalRelation,
    NumericRangeSpec,
    PrecisionSpec,
    RuleCategory,
    RuleScope,
    RuleStrength,
    SourceRuleCardSpec,
)

if TYPE_CHECKING:
    from collections.abc import Mapping

    from .rules import RuleSpec

_CATEGORY_CODE: Final = {
    RuleCategory.COMPLETENESS: 1,
    RuleCategory.VALIDITY: 3,
    RuleCategory.UNIQUENESS: 4,
    RuleCategory.CUSTOM_SQL: 5,
    RuleCategory.STATISTICAL: 6,
    RuleCategory.CONSISTENCY: 7,
    RuleCategory.TIMELINESS: 8,
    RuleCategory.REASONABLENESS: 9,
}
_SCOPE_CODE: Final = {RuleScope.FIELD: 0, RuleScope.TABLE: 1}
_FIXED_VALUE_VERIFY_TYPE: Final = 1
_MANUAL_FILTER_TYPE: Final = 0
_VALIDITY_FUNCTION_IDS: Final = {
    "数值-枚举个数": 12,
    "数值-取值范围": 25,
    "字符串长度": 26,
    "数据精度": 27,
    "枚举值": 30,
}
_SEMANTIC_KEYS: Final = frozenset(
    {
        "columnName",
        "functionId",
        "filter",
        "filterConfigType",
        "customizeSql",
        "verifyType",
        "operator",
        "logic",
        "threshold",
        "monitorType",
        "range",
        "type",
        "level",
        "isStandard",
        "standardRuleList",
        "singleVerifyType",
        "compareTables",
        "condition",
        "firstOperator",
        "firstThreshold",
        "secondOperator",
        "secondThreshold",
        "ruleStrength",
        "isCustom",
        "description",
        "ruleLibraryId",
        "ruleLibraryValue",
        "ruleLibraryContent",
        "customRuleId",
        "columnVerifys",
        "customConfigParams",
        "expansion",
        "selectColumns",
        "filterSql",
    }
)
_NUMERIC_KEYS: Final = frozenset(
    {
        "functionId",
        "filterConfigType",
        "verifyType",
        "monitorType",
        "type",
        "level",
        "isStandard",
        "singleVerifyType",
        "ruleStrength",
        "isCustom",
        "ruleLibraryId",
        "customRuleId",
    }
)


class RuleSemanticContractError(AssertionError):
    """Raised when a submitted or persisted rule loses canonical semantics."""


@dataclass(frozen=True, slots=True)
class RulePayloadFingerprint:
    """Stable normalized semantic fields without server-generated SQL or metadata."""

    fields: tuple[tuple[str, str], ...]

    def contains(self, submitted: RulePayloadFingerprint) -> bool:
        """Return whether this persisted fingerprint contains every submitted field."""
        values = dict(self.fields)
        return all(values.get(key) == value for key, value in submitted.fields)


def fingerprint_rule_payload(payload: Mapping[str, object]) -> RulePayloadFingerprint:
    """Normalize all recognized semantic request/detail fields deterministically."""
    fields: list[tuple[str, str]] = []
    for key in sorted(_SEMANTIC_KEYS):
        if key not in payload or payload[key] is None:
            continue
        normalized = _normalize_semantic_value(key, payload[key])
        fields.append(
            (
                key,
                json.dumps(normalized, ensure_ascii=False, sort_keys=True, separators=(",", ":")),
            )
        )
    return RulePayloadFingerprint(fields=tuple(fields))


def assert_persisted_fingerprint(
    *,
    submitted: RulePayloadFingerprint,
    persisted: RulePayloadFingerprint,
) -> None:
    """Require every submitted semantic field to survive detail persistence."""
    if not persisted.contains(submitted):
        _fail("persisted rule detail must preserve the complete submitted semantic fingerprint")


def assert_rule_payload_matches_spec(
    payload: Mapping[str, object],
    *,
    rule: RuleSpec,
    description: str,
) -> RulePayloadFingerprint:
    """Bind one unique request rule to the complete typed value-rule specification."""
    fingerprints = assert_rule_card_payload_matches_spec(
        payload,
        card=SourceRuleCardSpec(category=rule.category, rules=(rule,)),
        description=description,
    )
    return fingerprints[rule.index]


def assert_rule_card_payload_matches_spec(
    payload: Mapping[str, object],
    *,
    card: SourceRuleCardSpec,
    description: str,
) -> dict[int, RulePayloadFingerprint]:
    """Validate one visible parent card and return child persistence fingerprints."""
    if card.category is RuleCategory.VALIDITY:
        return _assert_normative_card(payload, card=card, description=description)
    if len(card.rules) != 1:
        _fail("non-normative rule cards must contain exactly one executable rule")
    rule = card.rules[0]
    if rule.category is not RuleCategory.COMPLETENESS or not isinstance(
        rule.detail, FixedValueSpec
    ):
        _fail("current product contract does not support this typed rule detail safely")
    return {rule.index: _assert_flat_value_rule(payload, rule=rule, description=description)}


def _assert_flat_value_rule(
    payload: Mapping[str, object],
    *,
    rule: RuleSpec,
    description: str,
) -> RulePayloadFingerprint:
    _expect(payload, "type", _CATEGORY_CODE[rule.category])
    _expect(payload, "description", description)
    _expect(
        payload,
        "ruleStrength",
        1 if rule.strength is RuleStrength.WEAK else 2,
    )
    _expect_positive_id(payload, "functionId")
    expected_scope = rule.scope or (RuleScope.FIELD if rule.fields else RuleScope.TABLE)
    _expect(payload, "level", _SCOPE_CODE[expected_scope])
    if _normalize_fields(payload.get("columnName")) != rule.fields:
        _fail("rule request fields must exactly match the typed specification")
    expected_logic = _relation_value(rule.field_relation)
    if expected_logic is not None:
        _expect(payload, "logic", expected_logic)
    if rule.filter_expression is None:
        if payload.get("filter") not in (None, ""):
            _fail("rule request must not add an undeclared filter")
    else:
        _expect(payload, "filter", rule.filter_expression)
        _expect(payload, "filterConfigType", _MANUAL_FILTER_TYPE)
    _assert_value_detail(payload, rule=rule)
    return fingerprint_rule_payload(payload)


def _assert_normative_card(
    payload: Mapping[str, object],
    *,
    card: SourceRuleCardSpec,
    description: str,
) -> dict[int, RulePayloadFingerprint]:
    _expect(payload, "type", _CATEGORY_CODE[RuleCategory.VALIDITY])
    _expect(payload, "description", description)
    _expect(
        payload,
        "ruleStrength",
        1 if card.strength is RuleStrength.WEAK else 2,
    )
    if _normalize_fields(payload.get("columnName")) != card.fields:
        _fail("normative parent card fields must exactly match the typed specification")
    if payload.get("isStandard") not in (None, 0):
        _fail("automation-owned normative cards must not import mutable standard rules")
    for key in ("functionId", "verifyType", "operator", "threshold", "filter"):
        if payload.get(key) not in (None, ""):
            _fail("normative executable semantics must be nested under standardRuleList")
    by_function_id = _nested_children_by_function_id(
        payload.get("standardRuleList"),
        expected_count=len(card.rules),
    )
    fingerprints: dict[int, RulePayloadFingerprint] = {}
    for rule in card.rules:
        expected_function_id = _VALIDITY_FUNCTION_IDS.get(rule.function_name)
        if expected_function_id is None or expected_function_id not in by_function_id:
            _fail("normative nested function must match a source-backed product identifier")
        child = by_function_id[expected_function_id]
        _assert_nested_value_detail(child, rule=rule)
        _assert_filter(child, rule=rule)
        flattened = dict(child)
        flattened.update(
            {
                "type": _CATEGORY_CODE[RuleCategory.VALIDITY],
                "columnName": list(card.fields),
                "ruleStrength": 1 if card.strength is RuleStrength.WEAK else 2,
                "description": description,
            }
        )
        if payload.get("isStandard") is not None:
            flattened["isStandard"] = payload["isStandard"]
        fingerprints[rule.index] = fingerprint_rule_payload(flattened)
    return fingerprints


def _nested_children_by_function_id(
    value: object,
    *,
    expected_count: int,
) -> dict[int, Mapping[str, object]]:
    if not isinstance(value, list):
        _fail("normative parent card must submit every nested executable rule exactly once")
    raw = cast("list[object]", value)
    if len(raw) != expected_count:
        _fail("normative parent card must submit every nested executable rule exactly once")
    children = tuple(_mapping(item, "normative standardRuleList child") for item in raw)
    result: dict[int, Mapping[str, object]] = {}
    for child in children:
        function_id = _positive_integer(child.get("functionId"), label="functionId")
        if function_id in result:
            _fail("normative nested function identifiers must be unique within one card")
        result[function_id] = child
    return result


def _assert_nested_value_detail(payload: Mapping[str, object], *, rule: RuleSpec) -> None:
    detail = rule.detail
    if isinstance(detail, FixedValueSpec):
        if detail.method == "固定值":
            _expect(payload, "verifyType", _FIXED_VALUE_VERIFY_TYPE)
        _expect(payload, "operator", detail.predicate.operator.value)
        _expect(payload, "threshold", detail.predicate.value)
        return
    if isinstance(detail, NumericRangeSpec):
        _expect(payload, "firstOperator", detail.first.operator.value)
        _expect(payload, "firstThreshold", detail.first.value)
        if detail.second is None:
            if any(
                payload.get(key) not in (None, "")
                for key in ("condition", "secondOperator", "secondThreshold")
            ):
                _fail("single-sided range must not submit a second predicate")
            return
        _expect(payload, "condition", _condition_value(detail.relation))
        _expect(payload, "secondOperator", detail.second.operator.value)
        _expect(payload, "secondThreshold", detail.second.value)
        return
    if isinstance(detail, EnumValueSpec) and detail.operator is EnumOperator.IN:
        _expect(payload, "threshold", ",".join(detail.values))
        if payload.get("operator") not in (None, ""):
            _fail("source-backed enum membership has no independent operator control")
        return
    if isinstance(detail, PrecisionSpec):
        _expect(payload, "firstOperator", detail.integer_digits.operator.value)
        _expect(payload, "firstThreshold", detail.integer_digits.value)
        _expect(payload, "condition", _condition_value(detail.relation))
        _expect(payload, "secondOperator", detail.fractional_digits.operator.value)
        _expect(payload, "secondThreshold", detail.fractional_digits.value)
        return
    _fail("current product contract does not support this nested validity detail safely")


def _assert_filter(payload: Mapping[str, object], *, rule: RuleSpec) -> None:
    if rule.filter_expression is None:
        if payload.get("filter") not in (None, ""):
            _fail("rule request must not add an undeclared filter")
        return
    _expect(payload, "filter", rule.filter_expression)
    _expect(payload, "filterConfigType", _MANUAL_FILTER_TYPE)


def _assert_value_detail(payload: Mapping[str, object], *, rule: RuleSpec) -> None:
    detail = rule.detail
    if not isinstance(detail, FixedValueSpec):
        _fail("current product contract does not support this typed rule detail safely")
    if detail.method == "固定值":
        _expect(payload, "verifyType", _FIXED_VALUE_VERIFY_TYPE)
    _expect(payload, "operator", detail.predicate.operator.value)
    _expect(payload, "threshold", detail.predicate.value)


def _normalize_semantic_value(key: str, value: object) -> object:
    if key == "columnName":
        return list(_normalize_fields(value))
    if key == "expansion" and isinstance(value, str):
        try:
            value = json.loads(value)
        except json.JSONDecodeError as error:
            message = "rule expansion must contain valid JSON"
            raise RuleSemanticContractError(message) from error
    if key in _NUMERIC_KEYS:
        return _positive_or_zero_integer(value, label=key)
    return _normalize_json(value)


def _normalize_json(value: object) -> object:
    if value is None or isinstance(value, (bool, int, float, str)):
        return value
    if isinstance(value, list):
        return [_normalize_json(item) for item in cast("list[object]", value)]
    if isinstance(value, dict):
        mapping = _mapping(cast("dict[object, object]", value), "semantic object")
        return {key: _normalize_json(mapping[key]) for key in sorted(mapping)}
    return _fail("rule semantic payload must contain JSON-compatible values")


def _normalize_fields(value: object) -> tuple[str, ...]:
    if isinstance(value, str):
        return tuple(part.strip() for part in value.split(",") if part.strip())
    if isinstance(value, list):
        raw = cast("list[object]", value)
        if any(not isinstance(item, str) or not item.strip() for item in raw):
            _fail("rule request fields must be non-empty text")
        return tuple(cast("str", item).strip() for item in raw)
    if value is None:
        return ()
    return _fail("rule request fields must be text or an array")


def _mapping(value: object, label: str) -> Mapping[str, object]:
    if not isinstance(value, dict):
        _fail(f"{label} must be an object")
    untyped = cast("dict[object, object]", value)
    if any(not isinstance(key, str) for key in untyped):
        _fail(f"{label} must use text keys")
    return cast("Mapping[str, object]", untyped)


def _expect(payload: Mapping[str, object], key: str, expected: object) -> None:
    if payload.get(key) != expected:
        _fail(f"rule request field {key} must exactly match the typed specification")


def _expect_positive_id(payload: Mapping[str, object], key: str) -> None:
    value = payload.get(key)
    if isinstance(value, bool) or not isinstance(value, (int, str)):
        _fail(f"rule request field {key} must be a positive backend identifier")
    text = str(value)
    if not text.isdigit() or int(text) < 1:
        _fail(f"rule request field {key} must be a positive backend identifier")


def _positive_integer(value: object, *, label: str) -> int:
    if isinstance(value, bool) or not isinstance(value, (int, str)):
        _fail(f"rule semantic field {label} must be a positive integer")
    text = str(value)
    if not text.isdigit() or int(text) < 1:
        _fail(f"rule semantic field {label} must be a positive integer")
    return int(text)


def _positive_or_zero_integer(value: object, *, label: str) -> int:
    if isinstance(value, bool) or not isinstance(value, (int, str)):
        _fail(f"rule semantic field {label} must be a non-negative integer")
    text = str(value)
    if not text.isdigit():
        _fail(f"rule semantic field {label} must be a non-negative integer")
    return int(text)


def _relation_value(relation: LogicalRelation | None) -> str | None:
    if relation is None:
        return None
    return "and" if relation is LogicalRelation.AND else "or"


def _condition_value(relation: LogicalRelation | None) -> str:
    if relation is None:
        _fail("two-sided nested predicates must declare an explicit relation")
    return "AND" if relation is LogicalRelation.AND else "OR"


def _fail(message: str) -> Never:
    raise RuleSemanticContractError(message)
