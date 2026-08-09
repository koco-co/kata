"""C0019 explicit SQL-merge write candidate."""
# ruff: noqa: E501, INP001, PLR0913, PLR0917, RUF001


from __future__ import annotations

from typing import TYPE_CHECKING

from data_assets_playwright_web_ui.components.navigation import DataAssetsNavigation
from data_assets_playwright_web_ui.domains.data_quality.sql_merge_optimization.actions import (
    SqlMergeWriteActions,
)
from data_assets_playwright_web_ui.domains.data_quality.sql_merge_optimization.catalog_builders import (
    rule_set_spec,
    task_spec,
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
from data_assets_playwright_web_ui.domains.data_quality.sql_merge_optimization.validity_rule_catalog import (
    ValidityRuleProfile,
    validity_rules,
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

_RULES = ("数值-取值范围", "数值-枚举个数", "枚举值", "取值范围&枚举范围")
_RULE_SPECS = validity_rules(ValidityRuleProfile.ALL_UNPASSED)
_SCENARIO = WriteScenario(
    case_id="C0019",
    table_name="test_table_15862_c0019",
    rule_functions=_RULES,
    field_shape=FieldShape.SINGLE_FIELD,
    merge_batch_size=10,
    topology=SqlTopologyExpectation(
        mode=MergeMode.FULL,
        merged_rule_groups=((1, 2, 3, 4),),
        isolated_rules=(),
        sampling_percent=50,
        partition_filter="dt=2026-08-04",
    ),
    result=RuleResultExpectation(),
    rule_set=rule_set_spec("C0019", purpose="SQL合并C0019 canonical规则包", rules=_RULE_SPECS),
    task=task_spec(
        "C0019",
        merge_batch_size=10,
        sampling_percent=50,
        partition_filter="dt=2026-08-04",
        expected_generated_sql_package_count=10,
    ),
)


@automation_case(
    project_id="data-assets", feature_id="quality-rule-sql-merge-optimization", case_id="C0019"
)
def test_sql_merge_c0019(
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
        action="创建C0019本次attempt独占Spark双分区表",
        expected="按canonical seed contract写入受控源表并取得脱敏fingerprint",
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
        action="通过UI新建C0019规则集与监控任务",
        expected="规则集record ID与task MonitorRule ID分别精确回读",
        target=scenario.table_name,
    ):
        provisioned = actions.provision(scenario)
    with step(
        action="读取C0019规则SQL并验证成员、扫描和脏表拓扑",
        expected="SQL结构、规则成员、抽样与分区语义均与canonical一致",
        target=f"{provisioned.task_name}/{scenario.table_name}",
    ):
        topology = actions.inspect_sql_topology(provisioned)
    with step(
        action="立即执行C0019规则任务并打开本次新实例",
        expected="以baseline排除历史实例，只接受本次新增record ID",
        target=provisioned.task_name,
    ):
        drawer, instance_id, finished_at = actions.execute_and_open_fresh_result(provisioned)
    with step(
        action="读取C0019逐规则结果",
        expected="结果按persisted MonitorRule ID绑定，不以顺序或首行消歧",
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
            "case_id": _SCENARIO.case_id,
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
