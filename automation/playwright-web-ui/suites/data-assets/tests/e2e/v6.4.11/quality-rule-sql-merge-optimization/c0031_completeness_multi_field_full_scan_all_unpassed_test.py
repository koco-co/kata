"""C0031: full-scan multi-field completeness rules all remain unpassed."""

# ruff: noqa: INP001, PLR0913, PLR0917, RUF001
from __future__ import annotations

from typing import TYPE_CHECKING

from data_assets_playwright_web_ui.components.navigation import DataAssetsNavigation
from data_assets_playwright_web_ui.domains.data_quality.sql_merge_optimization.actions import (
    SqlMergeWriteActions,
)
from data_assets_playwright_web_ui.domains.data_quality.sql_merge_optimization.catalog_builders import (  # noqa: E501
    rule_set_spec,
    task_spec,
)
from data_assets_playwright_web_ui.domains.data_quality.sql_merge_optimization.completeness_rule_catalog import (  # noqa: E501
    CompletenessRuleProfile,
    completeness_rules,
)
from data_assets_playwright_web_ui.domains.data_quality.sql_merge_optimization.model import (
    FieldShape,
    MergeMode,
    RuleResultExpectation,
    SqlTopologyExpectation,
    WriteScenario,
)
from data_assets_playwright_web_ui.domains.data_quality.sql_merge_optimization.screen import (
    SqlMergeOptimizationScreen,
)
from data_assets_playwright_web_ui.domains.data_quality.sql_merge_optimization.seed_catalog import (
    canonical_main_seed_plan,
)
from playwright_web_ui import automation_case

if TYPE_CHECKING:
    from playwright.sync_api import Page

    from data_assets_playwright_web_ui.domains.data_quality.sql_merge_optimization.fixtures import (
        SqlMergeSparkSeedFactory,
    )
    from playwright_web_ui.business_records import BusinessRecordRecorder
    from playwright_web_ui.platform_context import PlatformContext
    from playwright_web_ui.pytest_plugin import StepFixture
    from playwright_web_ui.runtime_identity import AutomationRuntimeIdentity

_RULES = ("空值数", "空值率", "空串数", "空串率", "表行数")
_RULE_SPECS = completeness_rules(CompletenessRuleProfile.MULTI_UNPASSED)
_SCENARIO = WriteScenario(
    case_id="C0031",
    table_name="test_table_15862_c0031",
    task_name="RuleA",
    rule_package_name="完整性可合并规则",
    rule_functions=_RULES,
    field_shape=FieldShape.MULTI_FIELD,
    merge_batch_size=10,
    topology=SqlTopologyExpectation(
        mode=MergeMode.FULL,
        merged_rule_groups=((1, 2, 3, 4, 5),),
        isolated_rules=(),
        sampling_percent=None,
        partition_filter="dt=2026-08-04",
    ),
    result=RuleResultExpectation(passed_rules=(), unpassed_rules=(1, 2, 3, 4, 5)),
    rule_set=rule_set_spec(
        "C0031",
        purpose="完整性可合并规则",
        rules=_RULE_SPECS,
    ),
    task=task_spec(
        "C0031",
        merge_batch_size=10,
        sampling_percent=None,
        partition_filter="dt=2026-08-04",
        expected_generated_sql_package_count=1,
    ),
)


@automation_case(
    project_id="data-assets", feature_id="quality-rule-sql-merge-optimization", case_id="C0031"
)
def test_completeness_multi_field_full_scan_all_unpassed(
    page: Page,
    platform_context: PlatformContext,
    automation_identity: AutomationRuntimeIdentity,
    business_records: BusinessRecordRecorder,
    step: StepFixture,
    sql_merge_spark_seed: SqlMergeSparkSeedFactory,
) -> None:
    actions = SqlMergeWriteActions(
        SqlMergeOptimizationScreen(DataAssetsNavigation(page, platform_context)),
        automation_identity,
    )
    actions.verify_identity(_SCENARIO)
    with step(
        action="创建C0031本次attempt独占Spark双分区表",
        expected="按canonical八字段结构写入两个分区各六行并取得脱敏fingerprint",
        target="Spark Batch API",
    ):
        seed_receipt = sql_merge_spark_seed.setup(
            canonical_main_seed_plan(
                case_id=_SCENARIO.case_id,
                ownership_token=automation_identity.collision_token,
            )
        )
        scenario = _SCENARIO.bind_seed(seed_receipt)
    with step(
        action="通过UI新建C0031规则集、五条完整性规则与监控任务",
        expected="规则集record ID与task MonitorRule ID分别精确回读",
        target=scenario.table_name,
    ):
        provisioned = actions.provision(scenario)
    with step(
        action="读取C0031五条多字段完整性规则与SQL",
        expected="无抽样临时表，五条规则单次扫描分区源表并共用脏表",
        target=f"{provisioned.task_name}/{scenario.table_name}",
    ):
        topology = actions.inspect_sql_topology(provisioned)
    with step(
        action="立即执行C0031规则任务",
        expected="生成本次新的已完成实例",
        target=provisioned.task_name,
    ):
        drawer, instance_id, finished_at = actions.execute_and_open_fresh_result(provisioned)
    with step(
        action="读取五条子规则结果",
        expected="五条规则全部未达标且均可查看明细",
        target="实例监控报告",
    ):
        readback = actions.verify_result(
            drawer=drawer,
            scenario=provisioned,
            instance_id=instance_id,
            finished_at=finished_at,
        )
    business_records.record(
        record_type="sql-merge-task-execution",
        record_id=instance_id,
        readback={
            "task_result": readback.as_json(),
            "sql_topology": topology.as_json(),
            "seed": {
                "table_names": list(seed_receipt.table_names),
                "schema_fingerprint": seed_receipt.schema_fingerprint,
                "data_fingerprint": seed_receipt.data_fingerprint,
                "binding_fingerprint": seed_receipt.binding_fingerprint,
            },
            "rules": [rule.as_json() for rule in provisioned.rules],
        },
    )
