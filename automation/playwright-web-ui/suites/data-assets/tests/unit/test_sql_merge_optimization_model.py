from __future__ import annotations

import pytest

from data_assets_playwright_web_ui.domains.data_quality.sql_merge_optimization.model import (
    ALL_CASE_IDS,
    READ_ONLY_CASE_IDS,
    WRITE_CASE_IDS,
    FieldShape,
    MergeMode,
    ReadOnlyJourney,
    ResultBaseline,
    RuleExecutionReadback,
    RuleExecutionStatus,
    RuleFamily,
    RuleResultExpectation,
    SqlTopologyExpectation,
    TaskExecutionReadback,
    WriteScenario,
    read_only_scenario,
)

_WRITE_CASE_COUNT = 60
_READ_ONLY_CASE_COUNT = 12
_VALIDITY_RULE_COUNT = 4


def test_case_matrix_has_72_independent_canonical_identities() -> None:
    assert tuple(f"C{number:04d}" for number in range(1, 73)) == ALL_CASE_IDS
    assert len(WRITE_CASE_IDS) == _WRITE_CASE_COUNT
    assert len(READ_ONLY_CASE_IDS) == _READ_ONLY_CASE_COUNT
    assert set(WRITE_CASE_IDS).isdisjoint(READ_ONLY_CASE_IDS)
    assert set(WRITE_CASE_IDS) | set(READ_ONLY_CASE_IDS) == set(ALL_CASE_IDS)


@pytest.mark.parametrize(
    ("case_id", "journey", "family", "rule_count", "pass_rate"),
    [
        ("C0016", ReadOnlyJourney.DETAIL_DOWNLOAD, RuleFamily.VALIDITY, 4, None),
        ("C0017", ReadOnlyJourney.REPORT, RuleFamily.VALIDITY, 4, 0),
        ("C0018", ReadOnlyJourney.REPORT, RuleFamily.VALIDITY, 5, 100),
        ("C0024", ReadOnlyJourney.DETAIL_DOWNLOAD, RuleFamily.COMPLETENESS, 5, None),
        ("C0025", ReadOnlyJourney.REPORT, RuleFamily.COMPLETENESS, 4, 0),
        ("C0026", ReadOnlyJourney.REPORT, RuleFamily.COMPLETENESS, 4, 100),
        ("C0052", ReadOnlyJourney.DETAIL_DOWNLOAD, RuleFamily.VALIDITY, 4, None),
        ("C0053", ReadOnlyJourney.REPORT, RuleFamily.VALIDITY, 4, 0),
        ("C0054", ReadOnlyJourney.REPORT, RuleFamily.VALIDITY, 5, 100),
        ("C0060", ReadOnlyJourney.DETAIL_DOWNLOAD, RuleFamily.COMPLETENESS, 5, None),
        ("C0061", ReadOnlyJourney.REPORT, RuleFamily.COMPLETENESS, 4, 0),
        ("C0062", ReadOnlyJourney.REPORT, RuleFamily.COMPLETENESS, 4, 100),
    ],
)
def test_read_only_scenarios_preserve_canonical_business_semantics(
    case_id: str,
    journey: ReadOnlyJourney,
    family: RuleFamily,
    rule_count: int,
    pass_rate: int | None,
) -> None:
    scenario = read_only_scenario(case_id)

    assert scenario.case_id == case_id
    assert scenario.table_name == f"test_table_15862_{case_id.lower()}"
    assert scenario.journey is journey
    assert scenario.rule_family is family
    assert scenario.rule_count == rule_count
    assert scenario.report.pass_rate == pass_rate
    assert scenario.platform_write is False


def test_read_only_scenario_rejects_a_write_case() -> None:
    with pytest.raises(KeyError, match="not a read-only canonical case"):
        read_only_scenario("C0001")


def test_write_scenario_preserves_explicit_spark_topology_and_result_matrix() -> None:
    scenario = WriteScenario(
        case_id="C0019",
        table_name="test_table_15862_c0019",
        task_name="RuleA",
        rule_package_name="有效性可合并规则",
        rule_functions=("数值-取值范围", "数值-枚举个数", "枚举值", "取值范围&枚举范围"),
        field_shape=FieldShape.SINGLE_FIELD,
        merge_batch_size=1,
        topology=SqlTopologyExpectation(
            mode=MergeMode.FULL,
            merged_rule_groups=((1, 2, 3, 4),),
            isolated_rules=(),
            sampling_percent=50,
            partition_filter="dt=2026-08-04",
        ),
        result=RuleResultExpectation(passed_rules=(1, 2), unpassed_rules=(3, 4)),
    )

    assert scenario.rule_count == _VALIDITY_RULE_COUNT
    assert scenario.topology.expected_scan_groups == 1
    assert scenario.result.has_explicit_matrix is True
    assert scenario.platform_write is True


@pytest.mark.parametrize(
    "topology",
    [
        SqlTopologyExpectation(
            mode=MergeMode.FULL,
            merged_rule_groups=((1, 2),),
            isolated_rules=(),
            sampling_percent=50,
        ),
        SqlTopologyExpectation(
            mode=MergeMode.NONE,
            merged_rule_groups=(),
            isolated_rules=(1, 2),
            sampling_percent=None,
        ),
    ],
)
def test_write_scenario_rejects_topology_that_does_not_cover_rules(
    topology: SqlTopologyExpectation,
) -> None:
    with pytest.raises(ValueError, match="topology"):
        WriteScenario(
            case_id="C0005",
            table_name="test_table_15862_c0005",
            task_name="RuleA",
            rule_package_name="可合并规则",
            rule_functions=("空值数", "空串数", "数值-取值范围"),
            field_shape=FieldShape.MIXED,
            merge_batch_size=1,
            topology=topology,
            result=RuleResultExpectation(),
        )


def test_write_scenario_rejects_incomplete_explicit_result_matrix() -> None:
    with pytest.raises(ValueError, match="result matrix"):
        WriteScenario(
            case_id="C0020",
            table_name="test_table_15862_c0020",
            task_name="RuleA",
            rule_package_name="有效性可合并规则",
            rule_functions=("数值-取值范围", "数值-枚举个数", "枚举值", "取值范围&枚举范围"),
            field_shape=FieldShape.SINGLE_FIELD,
            merge_batch_size=1,
            topology=SqlTopologyExpectation(
                mode=MergeMode.FULL,
                merged_rule_groups=((1, 2, 3, 4),),
                isolated_rules=(),
                sampling_percent=50,
            ),
            result=RuleResultExpectation(passed_rules=(), unpassed_rules=(1, 2, 3)),
        )


def test_result_baseline_and_readback_keep_structured_instance_identity() -> None:
    baseline = ResultBaseline(
        instance_ids=("dq-instance-101", "dq-instance-102"),
        latest_time="2026-08-05 10:30:00",
    )
    readback = TaskExecutionReadback(
        instance_id="dq-instance-103",
        table_name="test_table_15862_c0019_a0123456789",
        task_name="RuleA",
        finished_at="2026-08-05 10:31:00",
        rule_results=(
            RuleExecutionReadback(
                index=1,
                monitor_rule_id="901",
                description="SQLCard01_a123",
                function_name="表行数",
                status=RuleExecutionStatus.PASSED,
            ),
            RuleExecutionReadback(
                index=2,
                monitor_rule_id="902",
                description="SQLCard02_a123",
                function_name="表行数",
                status=RuleExecutionStatus.UNPASSED,
            ),
        ),
    )

    assert baseline.contains("dq-instance-102") is True
    assert baseline.contains(readback.instance_id) is False
    assert readback.as_json()["instance_id"] == "dq-instance-103"
    assert readback.as_json()["rules"] == [
        {
            "index": 1,
            "persisted_id": "901",
            "description": "SQLCard01_a123",
            "function": "表行数",
            "status": "passed",
        },
        {
            "index": 2,
            "persisted_id": "902",
            "description": "SQLCard02_a123",
            "function": "表行数",
            "status": "unpassed",
        },
    ]


def test_result_baseline_rejects_duplicate_or_unsafe_row_keys() -> None:
    with pytest.raises(ValueError, match="unique safe"):
        ResultBaseline(instance_ids=("same", "same"), latest_time=None)
    with pytest.raises(ValueError, match="unique safe"):
        ResultBaseline(instance_ids=('unsafe"]',), latest_time=None)
