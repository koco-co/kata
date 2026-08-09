from __future__ import annotations

from typing import cast

import pytest

from data_assets_playwright_web_ui.domains.data_quality.sql_merge_optimization.report_api import (
    ReportApiContractError,
    decode_report_detail,
    decode_report_records,
)

_RULE_COUNT = 2
_PASS_RATE = 50
_UNPASS_STATUS = 4
_FINISHED_AT_EPOCH_MS = 1785911400000


def _rule(*, rule_id: int, status: int = 3) -> dict[str, object]:
    return {
        "recordId": 8001,
        "ruleId": rule_id,
        "functionType": "COMPLETENESS",
        "functionName": f"规则{rule_id}",
        "columnName": "id",
        "columnType": "BIGINT",
        "status": status,
        "checkDetail": "符合规则",
        "runFailDetail": "",
        "gmtCreate": _FINISHED_AT_EPOCH_MS,
        "ruleDesc": f"runtime-rule-{rule_id}",
        "level": 0,
    }


def _detail_payload() -> dict[str, object]:
    return {
        "success": True,
        "data": {
            "reportRecordId": 9001,
            "execEndTime": "2026-08-05 10:30:00",
            "needCar": 0,
            "reportName": "runtime-report",
            "reportTableList": [
                {
                    "reportTableSurvey": {
                        "tableName": "test_table_15862_c0001",
                        "ruleName": "runtime-task",
                        "datasourceName": "SparkSource",
                        "schemaName": "schema_a",
                        "partitionValue": "dt=2026-08-04",
                        "tableRows": 6,
                        "sampleCount": 3,
                        "vehicleCount": 0,
                        "fieldCount": 8,
                        "ruleCount": 2,
                        "verifyPassRate": 50,
                    },
                    "ruleResultDTO": {
                        "multiTableRule": [],
                        "singleTableRule": [],
                        "columnRule": [_rule(rule_id=101), _rule(rule_id=102, status=4)],
                    },
                }
            ],
        },
    }


def test_generated_report_page_decoder_preserves_exact_record_identity() -> None:
    records = decode_report_records(
        {
            "success": True,
            "data": {
                "contentList": [
                    {
                        "id": 9001,
                        "reportName": "runtime-report",
                        "tableNames": "test_table_15862_c0001",
                        "status": 2,
                        "execEndTime": "2026-08-05 10:30:00",
                    }
                ]
            },
        }
    )

    assert len(records) == 1
    assert records[0].record_id == "9001"
    assert records[0].is_success is True
    assert records[0].is_terminal is True


def test_generated_report_detail_decoder_binds_every_rule_and_summary_value() -> None:
    detail = decode_report_detail(_detail_payload())

    assert detail.record_id == "9001"
    assert detail.report_name == "runtime-report"
    assert detail.include_vehicle is False
    assert len(detail.tables) == 1
    table = detail.tables[0]
    assert table.task_name == "runtime-task"
    assert table.rule_count == _RULE_COUNT
    assert table.pass_rate == _PASS_RATE
    assert tuple(rule.rule_id for rule in table.rules) == ("101", "102")
    assert table.rules[1].status == _UNPASS_STATUS
    assert table.rules[1].finished_at_epoch_ms == _FINISHED_AT_EPOCH_MS


def test_generated_report_detail_rejects_unsafe_record_identity() -> None:
    payload = _detail_payload()
    data = payload["data"]
    assert isinstance(data, dict)
    data["reportRecordId"] = "unsafe/id"

    with pytest.raises(ReportApiContractError, match="safe ID"):
        decode_report_detail(payload)


def test_generated_report_detail_rejects_rule_count_without_complete_rows() -> None:
    payload = _detail_payload()
    data = payload["data"]
    assert isinstance(data, dict)
    tables = cast("list[object]", data["reportTableList"])
    table = cast("dict[str, object]", tables[0])
    assert isinstance(table, dict)
    survey = cast("dict[str, object]", table["reportTableSurvey"])
    assert isinstance(survey, dict)
    survey["ruleCount"] = 3

    with pytest.raises(ValueError, match="ruleCount"):
        decode_report_detail(payload)


def test_generated_report_detail_rejects_nonterminal_rule_status() -> None:
    payload = _detail_payload()
    data = payload["data"]
    assert isinstance(data, dict)
    tables = cast("list[object]", data["reportTableList"])
    table = cast("dict[str, object]", tables[0])
    assert isinstance(table, dict)
    result = cast("dict[str, object]", table["ruleResultDTO"])
    assert isinstance(result, dict)
    rules = cast("list[object]", result["columnRule"])
    rule = cast("dict[str, object]", rules[0])
    assert isinstance(rule, dict)
    rule["status"] = 0

    with pytest.raises(ValueError, match="status"):
        decode_report_detail(payload)
