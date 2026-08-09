from __future__ import annotations

import pytest

from data_assets_playwright_web_ui.domains.data_quality.json_value_validation import (
    CASES,
    FEATURE_ID,
    RuleReadback,
    SamplingReadback,
    TaskInstanceIdentity,
    TaskResultBaseline,
    TaskResultReadback,
)


def test_case_registry_is_complete_and_uses_canonical_table_identity() -> None:
    assert FEATURE_ID == "quality-json-value-format-validation"
    assert tuple(CASES) == tuple(f"C{index:04d}" for index in range(1, 30))
    for case_id, case in CASES.items():
        assert case.case_id == case_id
        assert case.table_name == f"test_table_15694_{case_id.lower()}"
        assert case.datasource_keys


def test_compatibility_cases_use_their_exact_single_datasource() -> None:
    assert CASES["C0016"].datasource_keys == ("sparkthrift",)
    assert CASES["C0017"].datasource_keys == ("doris",)
    assert CASES["C0018"].datasource_keys == ("hive",)


def test_rule_readback_serializes_only_visible_business_values() -> None:
    readback = RuleReadback(
        datasource="SparkThrift2.x",
        table_name="test_table_15694_c0008",
        package_name="层级key测试包",
        field_name="info",
        selected_keys=("person-name", "address-city"),
        description="C0008层级key规则_a012345678",
    )

    assert readback.as_json() == {
        "datasource": "SparkThrift2.x",
        "table_name": "test_table_15694_c0008",
        "package_name": "层级key测试包",
        "field_name": "info",
        "selected_keys": ["person-name", "address-city"],
        "description": "C0008层级key规则_a012345678",
    }


def test_task_result_readback_preserves_structured_terminal_instance_identity() -> None:
    readback = TaskResultReadback(
        datasource="Doris3.x",
        task_name="TaskA_a012345678",
        table_name="test_table_15694_c0015",
        instance_id="98127",
        execute_time="2026-08-09 12:00:00",
        status="已完成",
        rule_result="不通过",
        detail="格式-json格式校验 key对应value格式校验未通过",
    )

    assert readback.as_json()["instance_id"] == "98127"
    assert readback.as_json()["execute_time"] == "2026-08-09 12:00:00"
    assert readback.as_json()["rule_result"] == "不通过"


def test_task_result_baseline_retains_exact_pre_submit_ids() -> None:
    baseline = TaskResultBaseline(
        instances=(
            TaskInstanceIdentity("98127", "2026-08-09 12:00:00"),
            TaskInstanceIdentity("98128", "2026-08-09 12:01:00"),
        ),
    )

    assert baseline.instance_ids == frozenset({"98127", "98128"})


@pytest.mark.parametrize(
    ("ratio", "count"),
    [(0, 0), (50, 10), (100, 10_000_000)],
)
def test_sampling_readback_accepts_contract_boundaries(ratio: int, count: int) -> None:
    readback = SamplingReadback(ratio_percent=ratio, validated_count=count)

    assert readback.as_json() == {
        "ratio_percent": ratio,
        "validated_count": count,
    }


@pytest.mark.parametrize(
    ("ratio", "count"),
    [(-1, 10), (101, 10), (50, -1), (50, 10_000_001)],
)
def test_sampling_readback_rejects_values_outside_contract_bounds(
    ratio: int,
    count: int,
) -> None:
    with pytest.raises(ValueError, match="must be between"):
        SamplingReadback(ratio_percent=ratio, validated_count=count)
