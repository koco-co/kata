from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date

import pytest

from data_assets_playwright_web_ui.domains.data_quality.sql_merge_optimization.fixtures import (
    SqlMergeSparkSeedFactory,
)
from data_assets_playwright_web_ui.domains.data_quality.sql_merge_optimization.model import (
    FieldShape,
    MergeMode,
    RuleResultExpectation,
    SqlTopologyExpectation,
    WriteScenario,
)
from data_assets_playwright_web_ui.domains.data_quality.sql_merge_optimization.seed_catalog import (
    canonical_main_seed_plan,
)
from data_assets_playwright_web_ui.domains.data_quality.sql_merge_optimization.sql_seed import (
    SparkCleanupReceipt,
    SparkSeedPlan,
    SparkSeedReceipt,
    SqlSeedError,
)

_ROWS_PER_PARTITION = 6
_OWNERSHIP_IDENTITY = "a0123456789"
_SEED_JOB_FAILURE_CODE = "SQL_SEED_JOB_FAILED"
_CONTROLLED_FAILURE_DETAIL = "controlled failure"


def _plan(case_id: str = "C0031", identity: str | None = None) -> SparkSeedPlan:
    return canonical_main_seed_plan(
        case_id=case_id,
        ownership_token=identity or _OWNERSHIP_IDENTITY,
        current_date=date(2026, 8, 9),
    )


def test_canonical_seed_materializes_exact_schema_and_two_six_row_partitions() -> None:
    plan = _plan()

    assert tuple(column.name for column in plan.main.columns) == (
        "id",
        "age",
        "string_num",
        "name",
        "address",
        "money",
        "buy_date",
        "date_detail",
    )
    assert plan.main.partition_column == "dt"
    assert tuple(partition.value for partition in plan.main.partitions) == (
        "2026-08-04",
        "2026-08-05",
    )
    assert all(len(partition.rows) == _ROWS_PER_PARTITION for partition in plan.main.partitions)
    assert plan.main.partitions[0].rows[0] == (
        1,
        25,
        "001",
        "张三",
        "北京市朝阳区",
        "5000.00",
        date(2026, 7, 10),
        "订单已完成",
    )
    assert tuple(row[0] for row in plan.main.partitions[1].rows) == tuple(range(7, 13))
    assert plan.table_names == ("test_table_15862_c0031_a0123456789",)


@dataclass(slots=True)
class _FakeSeedClient:
    cleanup_failure_case: str | None = None
    calls: list[tuple[str, str]] = field(
        default_factory=list[tuple[str, str]],
    )

    def setup(self, plan: SparkSeedPlan) -> SparkSeedReceipt:
        self.calls.append(("setup", plan.case_id))
        return SparkSeedReceipt(
            case_id=plan.case_id,
            table_names=plan.table_names,
            schema_fingerprint=plan.schema_fingerprint,
            data_fingerprint=plan.data_fingerprint,
            binding_fingerprint="binding",
        )

    def cleanup(self, plan: SparkSeedPlan) -> SparkCleanupReceipt:
        self.calls.append(("cleanup", plan.case_id))
        if plan.case_id == self.cleanup_failure_case:
            raise SqlSeedError(_SEED_JOB_FAILURE_CODE, _CONTROLLED_FAILURE_DETAIL)
        return SparkCleanupReceipt(
            case_id=plan.case_id,
            table_names=tuple(reversed(plan.table_names)),
            binding_fingerprint="binding",
        )


def test_seed_factory_registers_only_successful_setup_and_cleans_in_reverse() -> None:
    client = _FakeSeedClient()
    factory = SqlMergeSparkSeedFactory(client)
    factory.setup(_plan("C0031", "a0123456789"))
    factory.setup(_plan("C0032", "a1123456789"))

    receipts = factory.cleanup_all()

    assert client.calls == [
        ("setup", "C0031"),
        ("setup", "C0032"),
        ("cleanup", "C0032"),
        ("cleanup", "C0031"),
    ]
    assert tuple(receipt.case_id for receipt in receipts) == ("C0032", "C0031")


def test_seed_factory_attempts_remaining_cleanup_and_surfaces_safe_failure() -> None:
    client = _FakeSeedClient(cleanup_failure_case="C0032")
    factory = SqlMergeSparkSeedFactory(client)
    factory.setup(_plan("C0031", "a0123456789"))
    factory.setup(_plan("C0032", "a1123456789"))

    with pytest.raises(SqlSeedError) as caught:
        factory.cleanup_all()

    assert caught.value.code == "SQL_SEED_CLEANUP_FAILED"
    assert client.calls[-2:] == [("cleanup", "C0032"), ("cleanup", "C0031")]


def test_write_scenario_binds_every_runtime_table_field_to_seed_receipt() -> None:
    plan = _plan()
    receipt = _FakeSeedClient().setup(plan)
    canonical = WriteScenario(
        case_id="C0031",
        table_name="test_table_15862_c0031",
        task_name="RuleA",
        rule_package_name="完整性可合并规则",
        rule_functions=("空值数", "空值率"),
        field_shape=FieldShape.SINGLE_FIELD,
        merge_batch_size=1,
        topology=SqlTopologyExpectation(
            mode=MergeMode.FULL,
            merged_rule_groups=((1, 2),),
            isolated_rules=(),
            sampling_percent=None,
        ),
        result=RuleResultExpectation(passed_rules=(), unpassed_rules=(1, 2)),
    )

    bound = canonical.bind_seed(receipt)

    assert bound.table_name == receipt.table_names[0]
    assert bound.seed_receipt == receipt
    assert canonical.seed_receipt is None
