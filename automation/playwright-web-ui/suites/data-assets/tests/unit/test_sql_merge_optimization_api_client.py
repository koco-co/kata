from __future__ import annotations

import pytest

from data_assets_playwright_web_ui.domains.data_quality.sql_merge_optimization.api_client import (
    DqApiContractError,
    decode_package_records,
    decode_persisted_rules,
    decode_resource_groups,
    decode_result_records,
    decode_rule_set_records,
    decode_task_records,
)

_STRONG_RULE = 2


def test_rule_set_decoder_preserves_nested_persisted_rule_ids() -> None:
    payload = {
        "success": True,
        "data": {
            "contentList": [
                {
                    "id": 101,
                    "dataSourceId": 12,
                    "sourceName": "SparkA",
                    "schemaName": "quality",
                    "tableName": "test_table_15862_c0001",
                    "description": "SQL合并C0001_a123",
                    "packageVOList": [
                        {
                            "packageName": "SQLC0001P1_a123",
                            "rules": [
                                {
                                    "id": 501,
                                    "functionName": "空值数",
                                    "description": "SQLR01_a123",
                                    "columnName": ["id", "age"],
                                    "filter": "id<=100",
                                    "ruleStrength": 1,
                                }
                            ],
                        }
                    ],
                }
            ]
        },
    }

    records = decode_rule_set_records(payload)

    assert records[0].rule_set_id == "101"
    assert records[0].packages[0].rules[0].persisted_id == "501"
    assert records[0].packages[0].rules[0].fields == ("id", "age")


def test_rule_set_decoder_flattens_normative_parent_to_child_record_ids() -> None:
    payload = {
        "success": True,
        "data": {
            "contentList": [
                {
                    "id": 101,
                    "dataSourceId": 12,
                    "sourceName": "SparkA",
                    "schemaName": "quality",
                    "tableName": "test_table_15862_c0019_a123",
                    "description": "SQL合并C0019_a123",
                    "packageVOList": [
                        {
                            "packageName": "SQLC0019P1_a123",
                            "rules": [
                                {
                                    "type": 3,
                                    "columnName": "id",
                                    "ruleStrength": 1,
                                    "description": "parent-display-value",
                                    "standardRules": [
                                        {
                                            "id": 701,
                                            "functionId": 25,
                                            "functionName": "数值-取值范围",
                                            "description": "SQLCard01_a123",
                                            "columnName": "id",
                                            "filter": "id<=100",
                                            "ruleStrength": 1,
                                        },
                                        {
                                            "id": 704,
                                            "functionId": 49,
                                            "functionName": "取值范围&枚举范围",
                                            "description": "SQLCard01_a123",
                                            "columnName": "id",
                                            "filter": "id<=80",
                                            "ruleStrength": 2,
                                        },
                                    ],
                                }
                            ],
                        }
                    ],
                }
            ]
        },
    }

    rules = decode_rule_set_records(payload)[0].packages[0].rules

    assert tuple(rule.persisted_id for rule in rules) == ("701", "704")
    assert tuple(rule.description for rule in rules) == (
        "SQLCard01_a123",
        "SQLCard01_a123",
    )
    assert rules[1].strength == _STRONG_RULE


def test_task_decoder_uses_monitor_id_and_exact_task_identity() -> None:
    payload = {
        "success": True,
        "data": {
            "data": [
                {
                    "id": 801,
                    "ruleName": "SQLTaskC0001_a123",
                    "tableName": "test_table_15862_c0001",
                    "sourceId": 12,
                    "dataName": "SparkA",
                    "sourceTypeName": "SparkThrift2.x",
                }
            ],
            "totalCount": 1,
        },
    }

    records = decode_task_records(payload)

    assert records[0].monitor_id == "801"
    assert records[0].task_name == "SQLTaskC0001_a123"


def test_result_decoder_keeps_record_and_monitor_ids_separate() -> None:
    payload = {
        "success": True,
        "data": {
            "data": [
                {
                    "id": 901,
                    "monitorId": 801,
                    "ruleName": "SQLTaskC0001_a123",
                    "tableName": "test_table_15862_c0001",
                    "dataSourceId": 12,
                    "sourceName": "SparkA",
                    "status": 3,
                    "executeTime": "2026-08-09 17:00:00",
                    "execEndTime": "2026-08-09 17:00:10",
                }
            ]
        },
    }

    records = decode_result_records(payload)

    assert records[0].record_id == "901"
    assert records[0].monitor_id == "801"
    assert records[0].is_success is True


def test_imported_rule_decoder_accepts_raw_rule_array_and_comma_fields() -> None:
    rules = decode_persisted_rules(
        {
            "success": True,
            "data": [
                {
                    "id": 501,
                    "functionName": "空值数",
                    "description": "SQLR01_a123",
                    "columnName": "id,age",
                    "filter": "id<=100",
                    "ruleStrength": 1,
                }
            ],
        }
    )

    assert rules[0].persisted_id == "501"
    assert rules[0].fields == ("id", "age")


def test_resource_group_decoder_requires_explicit_id_and_name() -> None:
    resources = decode_resource_groups(
        {
            "success": True,
            "data": [{"yarnResourceId": 71, "yarnResourceName": "默认资源组"}],
        }
    )

    assert tuple((item.resource_id, item.resource_name) for item in resources) == (
        ("71", "默认资源组"),
    )


def test_package_decoder_preserves_endpoint_order_and_sql_binding() -> None:
    packages = decode_package_records(
        {
            "success": True,
            "data": [
                {"packageId": 1, "packageName": "规则包1"},
                {"packageId": 2, "packageName": "规则包2"},
            ],
        }
    )

    assert tuple((item.package_id, item.package_name) for item in packages) == (
        ("1", "规则包1"),
        ("2", "规则包2"),
    )


@pytest.mark.parametrize(
    "payload",
    [
        {"success": False, "data": {"data": []}},
        {"success": True, "data": {"data": [{"id": 1, "monitorId": 1}]}},
        {"success": True, "data": {"data": [{"id": "unsafe value"}]}},
    ],
)
def test_result_decoder_rejects_failed_or_incomplete_contract(payload: object) -> None:
    with pytest.raises(DqApiContractError):
        decode_result_records(payload)
