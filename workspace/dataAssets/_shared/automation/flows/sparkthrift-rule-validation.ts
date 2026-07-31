// SparkThrift 数据质量规则校验的跨需求页面流程与断言。

import { getEnvConfig } from "../runtime/env-profile";
import { expect, type Page } from "@playwright/test";
import { queryRuleSetRecords } from "../pages/data-quality/api";
import type { SparkThriftQualityRuleValidationScenario } from "../pages/data-quality/contracts";
import { gotoDataQualityPage } from "../pages/data-quality/project-context";
import {
  expectArchiveMonitorRecordTableSearch,
  expectArchiveRuleValidationRecord,
} from "./sparkthrift-rule-validation/monitor-record";
import {
  createCustomSqlTemplateFixture,
  createSparkThriftArchiveValidationRuleSet,
  deleteRuleSetRowAndAssert,
  deleteTempRuleSetByDescriptionBestEffort,
  expectArchiveRuleSetDetail,
  expectArchiveRuleSetListAndConfiguredTableFilter,
} from "./sparkthrift-rule-validation/rule-set";
import {
  createSparkThriftArchiveValidationRuleTask,
  editSparkThriftArchiveValidationRuleTaskPartition,
  expectArchiveRuleTaskSingleDetectionToggle,
} from "./sparkthrift-rule-validation/rule-task";
import {
  runRuleTaskImmediately,
  searchRuleTaskByTableName,
} from "../pages/data-quality/rule-task-page";

export async function expectSparkThriftQualityRuleValidationContract(
  page: Page,
  sourceRef: string,
  scenario: SparkThriftQualityRuleValidationScenario,
): Promise<void> {
  const suffix = Date.now();
  const effectiveScenario: SparkThriftQualityRuleValidationScenario = scenario.customSqlTemplate
    ? {
        ...scenario,
        customSqlTemplate: {
          ...scenario.customSqlTemplate,
          ruleName: `${scenario.customSqlTemplate.ruleName}_${suffix}`,
        },
      }
    : scenario;
  const packageName = `${effectiveScenario.title}规则包_${suffix}`;
  const ruleSetDescription = `${effectiveScenario.title}_${suffix}`;
  // 平台「规则名称」限制 50 字符；场景标题用于规则集/规则包描述，任务名称使用短稳定前缀。
  const datasourceKey = effectiveScenario.datasourceKey ?? getEnvConfig().runtime.defaultDatasource;
  const ruleName = `v700_${datasourceKey}_${suffix}`;
  const failRuleName = `${ruleName}_f`;

  await deleteTempRuleSetByDescriptionBestEffort(
    page,
    sourceRef,
    effectiveScenario.tableName,
    `${effectiveScenario.title}_`,
  );

  if (effectiveScenario.customSqlTemplate) {
    await createCustomSqlTemplateFixture(page, sourceRef, effectiveScenario.customSqlTemplate);
  }

  await createSparkThriftArchiveValidationRuleSet(
    page,
    sourceRef,
    effectiveScenario,
    packageName,
    ruleSetDescription,
    effectiveScenario.fusionChecks,
  );
  if (effectiveScenario.fusionChecks?.ruleSetListAndConfiguredTableFilter) {
    await expectArchiveRuleSetListAndConfiguredTableFilter(
      page,
      sourceRef,
      effectiveScenario,
      ruleSetDescription,
    );
  }
  if (effectiveScenario.fusionChecks?.ruleSetDetail) {
    await expectArchiveRuleSetDetail(
      page,
      sourceRef,
      effectiveScenario,
      ruleSetDescription,
      packageName,
    );
  }
  await createSparkThriftArchiveValidationRuleTask(
    page,
    sourceRef,
    effectiveScenario,
    ruleName,
    packageName,
    {
      envParams: effectiveScenario.fusionChecks?.t1BeforeImmediateWithEnvParams,
      samplingRows: effectiveScenario.fusionChecks?.samplingRows,
      t1BeforeImmediate: Boolean(
        effectiveScenario.fusionChecks?.t1BeforeImmediateWithEnvParams?.length,
      ),
      partitionModesVisible: effectiveScenario.fusionChecks?.partitionModesVisible,
    },
  );
  if (effectiveScenario.fusionChecks?.taskDetectionToggle) {
    await expectArchiveRuleTaskSingleDetectionToggle(page, sourceRef, effectiveScenario, ruleName);
  }
  if (effectiveScenario.fusionChecks?.sameTableSecondTask) {
    await createSparkThriftArchiveValidationRuleTask(
      page,
      sourceRef,
      effectiveScenario,
      `${ruleName}_second`,
      packageName,
    );
  }

  await gotoDataQualityPage(page, "/dq/rule");
  await searchRuleTaskByTableName(page, effectiveScenario.tableName, sourceRef);
  const taskRow = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: effectiveScenario.tableName })
    .filter({ hasText: ruleName })
    .first();
  await runRuleTaskImmediately(page, sourceRef, taskRow);
  await expectArchiveRuleValidationRecord(page, sourceRef, effectiveScenario, ruleName, {
    expectedStatus: /校验通过/,
    expectedActualValue: effectiveScenario.passExpectedValue,
    expectedPartition: effectiveScenario.passPartition,
    passHasNoDirtyDetail: effectiveScenario.fusionChecks?.passHasNoDirtyDetail,
    expectedSamplingRows: effectiveScenario.fusionChecks?.samplingRows,
  });
  if (effectiveScenario.fusionChecks?.monitorRecordTableSearch) {
    await expectArchiveMonitorRecordTableSearch(page, sourceRef, effectiveScenario, ruleName);
  }

  const failByEditing = effectiveScenario.fusionChecks?.failByEditingExistingTask;
  if (failByEditing?.deleteRuleSetBeforeRun) {
    await deleteRuleSetRowAndAssert(
      page,
      sourceRef,
      effectiveScenario.tableName,
      ruleSetDescription,
    );
  }
  if (failByEditing) {
    await editSparkThriftArchiveValidationRuleTaskPartition(
      page,
      sourceRef,
      effectiveScenario,
      ruleName,
      {
        partitionMode: failByEditing.partitionMode,
      },
    );
  } else {
    await createSparkThriftArchiveValidationRuleTask(
      page,
      sourceRef,
      { ...effectiveScenario, passPartition: effectiveScenario.failPartition },
      failRuleName,
      packageName,
    );
  }
  await gotoDataQualityPage(page, "/dq/rule");
  await searchRuleTaskByTableName(page, effectiveScenario.tableName, sourceRef);
  const finalRuleName = failByEditing ? ruleName : failRuleName;
  const editedTaskRow = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: effectiveScenario.tableName })
    .filter({ hasText: finalRuleName })
    .first();
  await runRuleTaskImmediately(page, sourceRef, editedTaskRow);
  await expectArchiveRuleValidationRecord(page, sourceRef, effectiveScenario, finalRuleName, {
    expectedStatus: /校验异常|校验失败|校验不通过/,
    expectedActualValue: effectiveScenario.failExpectedValue,
    expectedPartition: effectiveScenario.failPartition,
    dirtyEvidence: effectiveScenario.dirtyEvidence,
    dirtyDetail: effectiveScenario.fusionChecks?.dirtyDetail,
  });
}

/**
 * 在同一个规则集中连续配置完整规则包，并用同一个任务验证通过/不通过分区。
 * 平台按表唯一约束规则集，因此完整规则矩阵不能拆成多个独立规则集。
 */
export async function expectSparkThriftQualityRuleMatrixContract(
  page: Page,
  sourceRef: string,
  scenarios: readonly SparkThriftQualityRuleValidationScenario[],
  datasourceKey: "sparkthrift" | "doris",
): Promise<void> {
  expect(scenarios.length, `${sourceRef}: 完整规则矩阵不能为空`).toBeGreaterThan(0);
  const firstScenario = { ...scenarios[0], datasourceKey };
  const matrixScenarios = scenarios.map((scenario) => ({ ...scenario, datasourceKey }));
  const suffix = Date.now();
  const packageName = `v700_${datasourceKey}_全量规则包_${suffix}`;
  const ruleSetDescription = `v700_${datasourceKey}_全量规则集_${suffix}`;
  const ruleName = `v700_${datasourceKey}_${suffix}`;
  const failRuleName = `${ruleName}_f`;

  await deleteTempRuleSetByDescriptionBestEffort(
    page,
    sourceRef,
    firstScenario.tableName,
    `v700_${datasourceKey}_全量规则集_`,
  );
  // 清理本轮早期单规则调试留下的规则集，仍通过页面删除，避免同表唯一规则集限制挡住全量矩阵。
  await deleteTempRuleSetByDescriptionBestEffort(
    page,
    sourceRef,
    firstScenario.tableName,
    `完整性校验-表级-表行数-v700-${datasourceKey}_`,
  );

  for (const scenario of matrixScenarios.slice(1)) {
    if (scenario.customSqlTemplate) {
      await createCustomSqlTemplateFixture(page, sourceRef, scenario.customSqlTemplate);
    }
  }

  await createSparkThriftArchiveValidationRuleSet(
    page,
    sourceRef,
    firstScenario,
    packageName,
    ruleSetDescription,
    undefined,
    matrixScenarios.slice(1),
  );

  await expect
    .poll(
      async () => {
        const records = await queryRuleSetRecords(page, firstScenario.tableName);
        const record = records.find((item) => item.description === ruleSetDescription);
        return Number(record?.ruleCount ?? 0);
      },
      {
        message: `${sourceRef}: 全量规则集应保存 ${matrixScenarios.length} 条子规则`,
        timeout: 60000,
      },
    )
    .toBe(matrixScenarios.length);

  await createSparkThriftArchiveValidationRuleTask(
    page,
    sourceRef,
    firstScenario,
    ruleName,
    packageName,
  );
  await gotoDataQualityPage(page, "/dq/rule");
  await searchRuleTaskByTableName(page, firstScenario.tableName, sourceRef);
  const passTaskRow = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: firstScenario.tableName })
    .filter({ hasText: ruleName })
    .first();
  await runRuleTaskImmediately(page, sourceRef, passTaskRow);
  await expectArchiveRuleValidationRecord(page, sourceRef, firstScenario, ruleName, {
    expectedStatus: /校验通过/,
    expectedActualValue: firstScenario.passExpectedValue,
    expectedPartition: firstScenario.passPartition,
  });

  await createSparkThriftArchiveValidationRuleTask(
    page,
    sourceRef,
    { ...firstScenario, passPartition: firstScenario.failPartition },
    failRuleName,
    packageName,
  );
  await gotoDataQualityPage(page, "/dq/rule");
  await searchRuleTaskByTableName(page, firstScenario.tableName, sourceRef);
  const failTaskRow = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: firstScenario.tableName })
    .filter({ hasText: failRuleName })
    .first();
  await runRuleTaskImmediately(page, sourceRef, failTaskRow);
  await expectArchiveRuleValidationRecord(page, sourceRef, firstScenario, failRuleName, {
    expectedStatus: /校验异常|校验失败|校验不通过/,
    expectedActualValue: firstScenario.failExpectedValue,
    expectedPartition: firstScenario.failPartition,
  });
}
