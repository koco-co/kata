import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, type Locator, type Page, test } from "@playwright/test";
import { createConnection, type ConnectionOptions } from "mysql2/promise";

import { getEnvConfig, syncMetadata } from "../../../../../../_shared/helpers";
import {
  EXPLICIT_RULE_CASE_SPECS,
  explicitRuleCaseNumbers,
  formatV6411ShortRuleName,
  loadV6411UiCaseMetas,
  type V6411RuleSpec,
  type V6411UiCaseSpec,
} from "../data/v6411-ui-case-specs";
import { baseRowsForV6411Case, type V6411BaseTableRow } from "../data/v6411-ui-base-table-data";
import { descendingActionCaseNumbers } from "../data/v6411-result-oracle";
import { hasTaskRuleImportFields, reimportAllTaskRules } from "../helpers/v6411-task-rule-import";

/** 根据数据源类型从环境配置中解析 database/schema */
function resolveDatabase(datasourceType: "Doris3.x" | "SparkThrift2.x"): string {
  const key = datasourceType === "SparkThrift2.x" ? "sparkthrift" : "doris";
  const datasource = getEnvConfig().datasources[key];
  if (!datasource) throw new Error(`environment datasource ${key} is not configured`);
  return datasource.sql.database;
}

type UiCaseBuild = {
  caseNo: number;
  sourceCaseId: string;
  datasourceName: string;
  datasourceType: "Doris3.x" | "SparkThrift2.x";
  database: string;
  tableName: string;
  fullTableName: string;
  compareTableName: string;
  fullCompareTableName: string;
  ruleName: string;
  fullTitle: string;
  packageName: string;
  packageCount: number;
  samplingEnabled: boolean;
  partitionEnabled: boolean;
  ruleSpec: V6411UiCaseSpec;
};

type UiSearchRoot = Page | Locator;

type UiResultStatus = "validation-pass" | "validation-unpass" | "run-failed" | "running" | "unknown";

type SelectOptionOptions = {
  required?: boolean;
  first?: boolean;
  maxScrollAttempts?: number;
};

type UiResultRecord = {
  generatedAt: string;
  caseNo: number;
  sourceCaseId: string;
  datasourceName: UiCaseBuild["datasourceName"];
  datasourceType: UiCaseBuild["datasourceType"];
  tableName: string;
  fullTableName: string;
  compareTableName: string;
  fullCompareTableName: string;
  ruleName: string;
  fullTitle: string;
  packageName: string;
  packageCount: number;
  samplingEnabled: boolean;
  partitionEnabled: boolean;
  result: {
    classification: UiResultStatus;
    statusText: string;
    tooltipTexts: string[];
    rowText: string;
  };
};

type UiCaseMappingRecord = {
  caseNo: number;
  sourceCaseId: string;
  datasourceName: UiCaseBuild["datasourceName"];
  datasourceType: UiCaseBuild["datasourceType"];
  ruleName: string;
  fullTitle: string;
  packageName: string;
  compareTableName: string;
  fullCompareTableName: string;
  packageCount: number;
  samplingEnabled: boolean;
  partitionEnabled: boolean;
  expectedRuleCount: number;
};

const FEATURE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const OUT_DIR = path.resolve(
  process.env.V6411_UI_REBUILD_OUT_DIR ?? defaultRunSubdir("ui-rebuild", "runs/20260703-v6411-ui-rebuild"),
);
const RESULT_JSONL = path.join(OUT_DIR, "ui-rebuild-results.jsonl");
const RESULT_SUMMARY_JSON = path.join(OUT_DIR, "ui-rebuild-result-summary.json");
const CREATED_RECORDS_JSONL = path.join(OUT_DIR, "ui-rebuild-created-records.jsonl");
const CASE_MAPPING_JSON = path.join(OUT_DIR, "ui-rebuild-case-mapping.json");
const OUTPUT_INIT_MARKER = path.join(OUT_DIR, ".ui-rebuild-output-initialized");
const BATCH_TABLE_SUFFIX_FILE = path.join(OUT_DIR, ".ui-rebuild-table-suffix");
const ENV = getEnvConfig();
const BASE_URL = ENV.urls.baseUrl;
const PROJECT_ID = String(ENV.projects.quality.id);
const PROJECT_NAME = ENV.projects.quality.name;
const SOURCE_BASE_TABLE_NAME = "test_info_1";
const CASE_FILTER = parseCaseFilter(resolveCaseFilterValue());
const EXISTING_TABLE_BY_CASE = parseExistingTableMap(process.env.V6411_UI_EXISTING_TABLES);
const BATCH_RUN_KEY = resolveBatchRunKey();
const BATCH_TABLE_SUFFIX = resolveBatchTableSuffix();
const RESULT_STRICT = process.env.V6411_UI_RESULT_STRICT === "1";
const SKIP_BASE_TABLE_CREATE = process.env.V6411_UI_SKIP_BASE_TABLE_CREATE === "1";
const REUSE_EXISTING_RECORDS = process.env.V6411_UI_REUSE_EXISTING_RECORDS === "1";
const DISCOVER_EXISTING_RECORDS = process.env.V6411_UI_RECORD_DISCOVERY !== "0";
const RESTORE_TASKS_ONLY = process.env.V6411_UI_RESTORE_TASKS_ONLY === "1";
const SKIP_RESULT_WAIT_AFTER_TRIGGER = process.env.V6411_UI_SKIP_RESULT_WAIT_AFTER_TRIGGER === "1";
const CASE_TIMEOUT_MS = Number(process.env.V6411_UI_REBUILD_CASE_TIMEOUT_MS ?? 90 * 60 * 1000);
const RESULT_TIMEOUT_MS = Number(process.env.V6411_UI_RESULT_TIMEOUT_MS ?? 8 * 60 * 1000);

if (EXISTING_TABLE_BY_CASE.size > 0 && !REUSE_EXISTING_RECORDS) {
  throw new Error(
    "V6411_UI_EXISTING_TABLES 仅允许与 V6411_UI_REUSE_EXISTING_RECORDS=1 一起使用；默认禁止复用旧业务记录。",
  );
}

if (REUSE_EXISTING_RECORDS && EXISTING_TABLE_BY_CASE.size === 0) {
  throw new Error("V6411_UI_REUSE_EXISTING_RECORDS=1 时必须逐条设置 V6411_UI_EXISTING_TABLES 映射。");
}

if (RESULT_STRICT && SKIP_RESULT_WAIT_AFTER_TRIGGER) {
  throw new Error("V6411_UI_RESULT_STRICT=1 时不能同时设置 V6411_UI_SKIP_RESULT_WAIT_AFTER_TRIGGER=1");
}

function defaultRunSubdir(subdir: string, fallbackRelativePath: string): string {
  if (process.env.KATA_ALLURE_RESULTS_DIR) {
    return path.join(path.dirname(path.resolve(process.env.KATA_ALLURE_RESULTS_DIR)), subdir);
  }
  return path.join(FEATURE_DIR, fallbackRelativePath);
}

test.setTimeout(CASE_TIMEOUT_MS);

test.describe("v6411 正式 UI 重建规则集和规则任务", () => {
  test.describe.configure({ mode: process.env.V6411_UI_CONTINUE_ON_CASE_FAILURE === "1" ? "default" : "serial" });

  test.beforeAll(() => {
    if (process.env.PW_FULLY_PARALLEL === "1") {
      throw new Error("v6411 生命周期必须串行执行，禁止设置 PW_FULLY_PARALLEL=1");
    }
  });

  test.beforeAll(() => {
    initializeOutputFiles();
  });

  test("选中的 UI 重建用例必须已经显式实现规则明细", async () => {
    const implemented = new Set(explicitRuleCaseNumbers());
    const missing = [...CASE_FILTER].filter((caseNo) => !implemented.has(caseNo));
    expect(
      missing,
      `以下用例尚未显式实现规则明细，不能进入 UI 创建流程: ${missing.map((caseNo) => `§${padCaseNo(caseNo)}`).join(", ")}`,
    ).toEqual([]);
  });

  for (const build of buildTargetCases()
    .filter((item) => CASE_FILTER.has(item.caseNo))
    .sort((left, right) => right.caseNo - left.caseNo)) {
    test(`§${padCaseNo(build.caseNo)} UI 重建 ${build.ruleName}`, async ({ page }, testInfo) => {
      testInfo.setTimeout(CASE_TIMEOUT_MS);
      const sourceRef = `SR-UI-V6411-REBUILD-${padCaseNo(build.caseNo)}`;
      fs.mkdirSync(OUT_DIR, { recursive: true });
      recordCreationProgress(build, "planned", sourceRef);
      expect(build.ruleName.length, `${sourceRef}: UI 规则名称必须不超过 50 个字`).toBeLessThanOrEqual(50);
      expect(
        build.ruleSpec.rules.length,
        `${sourceRef}: 必须按 CSV 创建 ${build.ruleSpec.expectedRuleCount} 条规则`,
      ).toBe(build.ruleSpec.expectedRuleCount);
      expect(
        new Set(build.ruleSpec.rules.map(ruleFingerprint)).size,
        `${sourceRef}: 规则不能重复`,
      ).toBe(build.ruleSpec.expectedRuleCount);

      await test.info().attach("ui-rebuild-case.json", {
        body: JSON.stringify(build, null, 2),
        contentType: "application/json",
      });

      if (EXISTING_TABLE_BY_CASE.has(build.caseNo) && !DISCOVER_EXISTING_RECORDS) {
        const mappedTable = EXISTING_TABLE_BY_CASE.get(build.caseNo);
        expect(
          mappedTable,
          `${sourceRef}: 复用映射必须明确指向当前批次表 ${build.tableName}`,
        ).toBe(build.tableName.toLowerCase());
        await test.step("步骤1-4: 复用已有 UI 规则集和规则任务记录", async () => {
          await assertRuleSetListRecord(page, build, sourceRef);
          if (REUSE_EXISTING_RECORDS) {
            await assertTaskListRecord(page, build, sourceRef);
          } else if (await taskListRecordExists(page, build, sourceRef)) {
            await assertTaskListRecord(page, build, sourceRef);
          } else {
            await createRuleTaskViaUi(page, build, sourceRef);
            recordCreationProgress(build, "rule-task-created-from-existing-rule-set", sourceRef);
          }
          recordCreationProgress(build, "existing-record-reused", sourceRef);
          await attachScreenshot(page, `${padCaseNo(build.caseNo)}-01-existing-record-reused`);
        });
      } else {
        await test.step("步骤1: 准备唯一底表测试数据前置", async () => {
          if (SKIP_BASE_TABLE_CREATE) {
            expect(
              SKIP_BASE_TABLE_CREATE,
              `${sourceRef}: Doris/SparkThrift 回归必须先手工执行对应 SQL，并设置 V6411_UI_SKIP_BASE_TABLE_CREATE=1`,
            ).toBe(true);
            recordCreationProgress(build, "base-table-manual-precondition", sourceRef);
            await attachScreenshot(page, `${padCaseNo(build.caseNo)}-01-base-table-manual-precondition`);
          } else {
            await createBaseTable(page, build, sourceRef);
            recordCreationProgress(build, "base-table-created", sourceRef);
            await attachScreenshot(page, `${padCaseNo(build.caseNo)}-01-base-table-created`);
          }
        });

        await test.step(
          SKIP_BASE_TABLE_CREATE
            ? "步骤2: 使用人工完成的底表和元数据前置，不执行 Playwright 同步"
            : "步骤2: 通过数据资产 UI 执行元数据临时同步",
          async () => {
          if (SKIP_BASE_TABLE_CREATE) {
            await test.info().attach("manual-table-metadata-precondition.json", {
              body: JSON.stringify(
                {
                  mode: "manual-table-and-metadata",
                  datasource: build.datasourceName,
                  database: build.database,
                  table: build.fullTableName,
                  compareTable: needsCompareTable(build) ? build.fullCompareTableName : undefined,
                  note: "底表和元数据由回归发起人提前完成；本用例跳过 Playwright 建表和元数据同步，后续 UI 表选择负责验证主表可用。",
                },
                null,
                2,
              ),
              contentType: "application/json",
            });
            recordCreationProgress(build, "metadata-manual-precondition", sourceRef);
            await attachScreenshot(page, `${padCaseNo(build.caseNo)}-02-metadata-manual-precondition`);
            return;
          }
          await syncMetadata(page, build.datasourceName, build.database, build.tableName, {
            requireExactTable: true,
            allowFilterFallbackForExactTable: build.datasourceType === "Doris3.x",
          });
          if (needsCompareTable(build)) {
            await syncMetadata(page, build.datasourceName, build.database, build.compareTableName, {
              requireExactTable: true,
              allowFilterFallbackForExactTable: build.datasourceType === "Doris3.x",
            });
          }
          recordCreationProgress(build, "metadata-synced", sourceRef);
          await attachScreenshot(page, `${padCaseNo(build.caseNo)}-02-metadata-synced`);
          },
        );

        await test.step(`步骤3: 规则集管理按存在性选择创建或编辑`, async () => {
          if (build.ruleSpec.rules.some((rule) => rule.category === "自定义SQL")) {
            await ensureCustomSqlTemplateViaUi(page, sourceRef);
            recordCreationProgress(build, "custom-sql-template-ready", sourceRef);
            await attachScreenshot(page, `${padCaseNo(build.caseNo)}-03-custom-sql-template-ready`);
          }
          const existingCount = DISCOVER_EXISTING_RECORDS
            ? await countRuleSetRecordsViaUi(page, build, sourceRef)
            : 0;
          if (existingCount > 1) {
            throw new Error(`${sourceRef}: 规则集管理发现 ${existingCount} 条重复记录，拒绝编辑歧义记录`);
          }
          if (existingCount === 1) {
            await editRuleSetViaUi(page, build, sourceRef);
            recordCreationProgress(build, "rule-set-edited-existing", sourceRef);
          } else {
            await createRuleSetViaUi(page, build, sourceRef);
            recordCreationProgress(build, "rule-set-created", sourceRef);
          }
          await assertRuleSetListRecord(page, build, sourceRef);
          await attachScreenshot(page, `${padCaseNo(build.caseNo)}-03-rule-set-${existingCount === 1 ? "edited" : "created"}`);
        });

        await test.step("步骤4: 规则任务管理按存在性选择创建或进入编辑流程", async () => {
          const existingTask = DISCOVER_EXISTING_RECORDS && await taskListRecordExists(page, build, sourceRef);
          if (existingTask) {
            recordCreationProgress(build, "rule-task-existing", sourceRef);
            await attachScreenshot(page, `${padCaseNo(build.caseNo)}-04-rule-task-existing`);
            return;
          }
          await createRuleTaskViaUi(page, build, sourceRef);
          recordCreationProgress(build, "rule-task-created", sourceRef);
          await attachScreenshot(page, `${padCaseNo(build.caseNo)}-04-rule-task-created`);
        });
      }

      await test.step("步骤5: 通过规则任务管理 UI 编辑任务、下一步并保存", async () => {
        await editRuleTaskViaUi(page, build, sourceRef);
        recordCreationProgress(build, "rule-task-edited-saved", sourceRef);
        await attachScreenshot(page, `${padCaseNo(build.caseNo)}-05-rule-task-edited-saved`);
      });

      if (RESTORE_TASKS_ONLY) {
        const restoredRow = await test.step("恢复模式: 只验证规则任务记录已补回", async () => {
          await gotoDataQualityPage(page, "/dq/rule");
          await searchTable(page, taskListSearchQuery(), sourceRef);
          const row = page
            .locator(".ant-table-tbody tr")
            .filter({ hasText: build.tableName })
            .filter({ hasText: build.ruleName })
            .first();
          await expect(row, `${sourceRef}: 恢复模式下规则任务记录必须存在`).toBeVisible({ timeout: 30_000 });
          await attachScreenshot(page, `${padCaseNo(build.caseNo)}-restore-task-exists`);
          return ((await row.innerText({ timeout: 10_000 }).catch(() => "")) ?? "").replace(/\s+/g, " ").trim();
        });
        const record: UiResultRecord = {
          generatedAt: new Date().toISOString(),
          caseNo: build.caseNo,
          sourceCaseId: build.sourceCaseId,
          datasourceName: build.datasourceName,
          datasourceType: build.datasourceType,
          tableName: build.tableName,
          fullTableName: build.fullTableName,
          compareTableName: build.compareTableName,
          fullCompareTableName: build.fullCompareTableName,
          ruleName: build.ruleName,
          fullTitle: build.fullTitle,
          packageName: build.packageName,
          packageCount: build.packageCount,
          samplingEnabled: build.samplingEnabled,
          partitionEnabled: build.partitionEnabled,
          result: {
            classification: "unknown",
            statusText: "restore-task-only",
            tooltipTexts: [],
            rowText: restoredRow,
          },
        };
        fs.appendFileSync(RESULT_JSONL, `${JSON.stringify(record)}\n`);
        recordCreationProgress(build, "restore-task-only-verified", sourceRef);
        await test.info().attach("ui-restore-task-result.json", {
          body: JSON.stringify(record, null, 2),
          contentType: "application/json",
        });
        return;
      }

      await test.step("步骤6: 通过规则任务管理 UI 点击立即执行", async () => {
        await gotoDataQualityPage(page, "/dq/rule");
        await searchTable(page, taskListSearchQuery(), sourceRef);
        const row = await findTaskRowAcrossPages(page, build, sourceRef);
        if (!row) throw new Error(`${sourceRef}: 任务列表应展示刚创建任务`);
        await ensureTaskDetectionEnabled(page, build, sourceRef);
        await searchTable(page, taskListSearchQuery(), sourceRef);
        await runTaskImmediatelyFromUi(page, row, sourceRef);
        recordCreationProgress(build, "immediate-run-clicked", sourceRef);
        await attachScreenshot(page, `${padCaseNo(build.caseNo)}-06-immediate-run-clicked`);
      });

      const result = SKIP_RESULT_WAIT_AFTER_TRIGGER
        ? await test.step("步骤7: 记录已通过 UI 触发立即执行，跳过结果终态等待", async () => {
            const status = {
              classification: "running" as UiResultStatus,
              statusText: "immediate-run-triggered-result-wait-skipped",
              tooltipTexts: [],
              rowText: `${build.fullTableName} ${build.ruleName} 已通过 UI 点击立即执行；本轮按 V6411_UI_SKIP_RESULT_WAIT_AFTER_TRIGGER=1 跳过结果终态等待`,
            };
            await test.info().attach("ui-rebuild-result-wait-skipped.json", {
              body: JSON.stringify(status, null, 2),
              contentType: "application/json",
            });
            return status;
          })
        : await test.step("步骤7: 通过校验结果查询 UI 获取最新状态", async () => {
            const status = await waitResultStatusFromUi(page, build.tableName, build.ruleName, sourceRef);
            await attachScreenshot(page, `${padCaseNo(build.caseNo)}-07-result-${status.classification}`);
            return status;
          });

      const record = {
        generatedAt: new Date().toISOString(),
        caseNo: build.caseNo,
        sourceCaseId: build.sourceCaseId,
        datasourceName: build.datasourceName,
        datasourceType: build.datasourceType,
        tableName: build.tableName,
        fullTableName: build.fullTableName,
        compareTableName: build.compareTableName,
        fullCompareTableName: build.fullCompareTableName,
        ruleName: build.ruleName,
        fullTitle: build.fullTitle,
        packageName: build.packageName,
        packageCount: build.packageCount,
        samplingEnabled: build.samplingEnabled,
        partitionEnabled: build.partitionEnabled,
        result,
      };
      fs.appendFileSync(RESULT_JSONL, `${JSON.stringify(record)}\n`);
      await test.info().attach("ui-rebuild-result.json", {
        body: JSON.stringify(record, null, 2),
        contentType: "application/json",
      });
      if (RESULT_STRICT) {
        expect(result.classification, `${sourceRef}: 校验结果应进入可统计终态`).toMatch(
          /validation-pass|validation-unpass|run-failed/,
        );
      } else if (result.classification === "running" || result.classification === "unknown") {
        test.info().annotations.push({
          type: "warning",
          description: `${sourceRef}: 校验结果未进入终态，已按 ${result.classification} 写入统计明细`,
        });
      }
    });
  }

  test("汇总选中的 UI 重建结果状态", async () => {
    test.skip(
      process.env.PW_FULLY_PARALLEL === "1",
      "并行重建阶段由各 worker 独立写入结果；汇总必须在 UI 用例完成后串行执行",
    );
    const selectedCases = [...CASE_FILTER].sort((left, right) => left - right);
    const records = loadLatestResultRecordsByCaseNo(selectedCases);
    const missing = selectedCases.filter((caseNo) => !records.has(caseNo));
    expect(missing, `选中用例必须都有校验结果记录，缺失: ${missing.map((caseNo) => `§${padCaseNo(caseNo)}`).join(", ")}`).toEqual([]);

    const rows = selectedCases.map((caseNo) => {
      const record = records.get(caseNo);
      if (!record) throw new Error(`missing result record for §${padCaseNo(caseNo)}`);
      return record;
    });
    const summary = summarizeResultRecords(rows);
    fs.writeFileSync(RESULT_SUMMARY_JSON, JSON.stringify(summary, null, 2));
    await test.info().attach("ui-rebuild-case-mapping.json", {
      body: fs.readFileSync(CASE_MAPPING_JSON),
      contentType: "application/json",
    });
    await test.info().attach("ui-rebuild-result-summary.json", {
      body: JSON.stringify(summary, null, 2),
      contentType: "application/json",
    });
    await test.info().attach("ui-rebuild-results.jsonl", {
      body: fs.readFileSync(RESULT_JSONL),
      contentType: "application/jsonl",
    });
    await test.info().attach("ui-rebuild-created-records.jsonl", {
      body: fs.readFileSync(CREATED_RECORDS_JSONL),
      contentType: "application/jsonl",
    });

    if (RESULT_STRICT) {
      expect(
        summary.counts.running + summary.counts.unknown,
        `选中用例结果必须进入可统计终态，详见 ${RESULT_SUMMARY_JSON}`,
      ).toBe(0);
    }
    expect(summary.selectedCaseCount, "结果汇总数量必须等于选中用例数").toBe(selectedCases.length);
    const selectedDorisCount = selectedCases.filter((caseNo) => caseNo <= 36).length;
    const selectedSparkCount = selectedCases.filter((caseNo) => caseNo >= 37).length;
    const dorisName = ENV.datasources.doris?.assets.name ?? ENV.datasources.doris?.batch?.name;
    const sparkName = ENV.datasources.sparkthrift?.batch.name;
    if (selectedDorisCount > 0) {
      expect(dorisName, "选中 Doris 用例时环境必须配置 Doris 数据源").toBeTruthy();
      expect(summary.byDatasource[dorisName ?? ""]?.total ?? 0, "Doris 结果数量必须等于选中的 Doris 用例数").toBe(
        selectedDorisCount,
      );
    }
    if (selectedSparkCount > 0) {
      expect(sparkName, "选中 SparkThrift 用例时环境必须配置 SparkThrift 数据源").toBeTruthy();
      expect(summary.byDatasource[sparkName ?? ""]?.total ?? 0, "SparkThrift 结果数量必须等于选中的 SparkThrift 用例数").toBe(
        selectedSparkCount,
      );
    }
  });
});

function buildTargetCases(): UiCaseBuild[] {
  const metasByCaseNo = new Map(loadV6411UiCaseMetas().map((item) => [item.caseNo, item]));
  return EXPLICIT_RULE_CASE_SPECS.filter((ruleSpec) => CASE_FILTER.has(ruleSpec.caseNo)).map((ruleSpec) => {
    const meta = metasByCaseNo.get(ruleSpec.caseNo);
    if (!meta) throw new Error(`missing v6411 case meta for §${padCaseNo(ruleSpec.caseNo)}`);
    if (meta.packageName !== ruleSpec.packageName) {
      throw new Error(
        `§${padCaseNo(ruleSpec.caseNo)} rule package name mismatch: meta=${meta.packageName}; spec=${ruleSpec.packageName}`,
      );
    }
    if (meta.packageCount !== ruleSpec.packageCount) {
      throw new Error(
        `§${padCaseNo(ruleSpec.caseNo)} rule package stitch count mismatch: meta=${meta.packageCount}; spec=${ruleSpec.packageCount}`,
      );
    }
    const tableName = tableNameForCase(ruleSpec.caseNo);
    const compareTableName = compareTableNameForCase(tableName);
    const database = resolveDatabase(meta.datasourceType);
    return {
      caseNo: meta.caseNo,
      sourceCaseId: meta.sourceCaseId,
      datasourceName: meta.datasourceName,
      datasourceType: meta.datasourceType,
      database,
      tableName,
      fullTableName: `${database}.${tableName}`,
      compareTableName,
      fullCompareTableName: `${database}.${compareTableName}`,
      ruleName: formatV6411ShortRuleName(meta.caseNo, meta.fullTitle),
      fullTitle: meta.fullTitle,
      packageName: meta.packageName,
      packageCount: ruleSpec.packageCount,
      samplingEnabled: ruleSpec.samplingEnabled,
      partitionEnabled: ruleSpec.partitionEnabled,
      ruleSpec,
    };
  });
}

function buildSelectedCaseMapping(): UiCaseMappingRecord[] {
  return buildTargetCases()
    .filter((item) => CASE_FILTER.has(item.caseNo))
    .sort((left, right) => left.caseNo - right.caseNo)
    .map((build) => ({
      caseNo: build.caseNo,
      sourceCaseId: build.sourceCaseId,
      datasourceName: build.datasourceName,
      datasourceType: build.datasourceType,
      ruleName: build.ruleName,
      fullTitle: build.fullTitle,
      packageName: build.packageName,
      compareTableName: build.compareTableName,
      fullCompareTableName: build.fullCompareTableName,
      packageCount: build.packageCount,
      samplingEnabled: build.samplingEnabled,
      partitionEnabled: build.partitionEnabled,
      expectedRuleCount: build.ruleSpec.expectedRuleCount,
    }));
}

function uniqueTableName(caseNo: number): string {
  return `${SOURCE_BASE_TABLE_NAME}_${BATCH_TABLE_SUFFIX}_${padCaseNo(caseNo)}`;
}

function compareTableNameForCase(tableName: string): string {
  return `${tableName}_cmp`;
}

function resolveCaseFilterValue(): string {
  if (process.env.V6411_UI_REBUILD_CASES?.trim()) return process.env.V6411_UI_REBUILD_CASES;
  if (process.env.V6411_UI_REBUILD_CONSISTENCY_ONLY === "1") {
    return EXPLICIT_RULE_CASE_SPECS
      .filter((spec) => spec.rules.some((rule) => rule.functionName === "多表数据一致性比对"))
      .map((spec) => spec.caseNo)
      .join(",");
  }
  return "1-72";
}

function tableNameForCase(caseNo: number): string {
  const existing = EXISTING_TABLE_BY_CASE.get(caseNo);
  if (existing) return existing.toLowerCase();

  const override = process.env.V6411_UI_TABLE_NAME?.trim().toLowerCase();
  if (override) {
    if (CASE_FILTER.size !== 1) {
      throw new Error("V6411_UI_TABLE_NAME 只允许单条调试时使用；正式批量运行必须使用批次随机后缀表名");
    }
    const expectedPattern = new RegExp(`^${escapeRegExp(SOURCE_BASE_TABLE_NAME)}_[a-z]{8}_\\d{2}$`);
    if (!expectedPattern.test(override)) {
      throw new Error(`V6411_UI_TABLE_NAME 必须符合 ${SOURCE_BASE_TABLE_NAME}_<8位英文>_<两位用例序号>: ${override}`);
    }
    const suffixCaseNo = Number(override.match(/_(\d{2})$/)?.[1]);
    if (suffixCaseNo !== caseNo) {
      throw new Error(`V6411_UI_TABLE_NAME 用例序号必须匹配当前 §${padCaseNo(caseNo)}: ${override}`);
    }
    return override;
  }

  return uniqueTableName(caseNo);
}

function resolveBatchTableSuffix(): string {
  const value = process.env.V6411_UI_TABLE_BATCH_SUFFIX?.trim().toLowerCase();
  if (value) {
    if (!/^[a-z]{8}$/.test(value)) {
      throw new Error(`V6411_UI_TABLE_BATCH_SUFFIX 必须是 8 位小写英文字母: ${value}`);
    }
    fs.mkdirSync(OUT_DIR, { recursive: true });
    writeJsonFile(BATCH_TABLE_SUFFIX_FILE, {
      runKey: BATCH_RUN_KEY,
      suffix: value,
      generatedAt: new Date().toISOString(),
      source: "env",
    });
    return value;
  }
  if (fs.existsSync(BATCH_TABLE_SUFFIX_FILE)) {
    const persisted = readBatchSuffixFile(BATCH_TABLE_SUFFIX_FILE);
    if (persisted && persisted.runKey === BATCH_RUN_KEY) {
      return persisted.suffix;
    }
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const result = randomLowercaseSuffix();
  writeJsonFile(BATCH_TABLE_SUFFIX_FILE, {
    runKey: BATCH_RUN_KEY,
    suffix: result,
    generatedAt: new Date().toISOString(),
    source: "random",
  });
  return result;
}

function resolveBatchRunKey(): string {
  const explicit = process.env.V6411_UI_REBUILD_RUN_KEY?.trim();
  if (explicit) return explicit;

  return [
    process.ppid.toString(),
    process.env.KATA_ALLURE_RESULTS_DIR,
    process.env.KATA_SUITE_NAME,
    process.env.V6411_UI_REBUILD_OUT_DIR,
  ]
    .filter((item): item is string => Boolean(item?.trim()))
    .join("|");
}

function readBatchSuffixFile(filePath: string): { runKey: string; suffix: string } | undefined {
  const raw = fs.readFileSync(filePath, "utf8").trim();
  if (!raw) return undefined;
  if (!raw.startsWith("{")) {
    if (/^[a-z]{8}$/.test(raw) && process.env.V6411_UI_ALLOW_LEGACY_BATCH_SUFFIX === "1") {
      return { runKey: BATCH_RUN_KEY, suffix: raw };
    }
    return undefined;
  }

  const parsed = JSON.parse(raw) as { runKey?: unknown; suffix?: unknown };
  if (typeof parsed.runKey !== "string" || typeof parsed.suffix !== "string" || !/^[a-z]{8}$/.test(parsed.suffix)) {
    throw new Error(`批次表名后缀文件内容非法: ${filePath}`);
  }
  return { runKey: parsed.runKey, suffix: parsed.suffix };
}

function randomLowercaseSuffix(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  let result = "";
  for (let index = 0; index < 8; index += 1) {
    result += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return result;
}

function parseCaseFilter(value: string | undefined): Set<number> {
  const result = new Set<number>();
  for (const item of (value ?? "").split(",")) {
    const trimmed = item.trim();
    const rangeMatch = trimmed.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      for (let caseNo = Math.min(start, end); caseNo <= Math.max(start, end); caseNo += 1) {
        if (caseNo >= 1 && caseNo <= 72) result.add(caseNo);
      }
      continue;
    }

    const number = Number(trimmed);
    if (Number.isFinite(number) && number >= 1 && number <= 72) result.add(number);
  }
  return result;
}

function parseExistingTableMap(value: string | undefined): Map<number, string> {
  const result = new Map<number, string>();
  for (const item of (value ?? "").split(",")) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    const [caseNoPart, tablePart] = trimmed.split(/:(.+)/).filter(Boolean);
    const caseNo = Number(caseNoPart);
    const tableName = (tablePart ?? "").trim().split(".").at(-1)?.trim() ?? "";
    if (!Number.isFinite(caseNo) || caseNo < 1 || caseNo > 72 || !tableName) {
      throw new Error(`invalid V6411_UI_EXISTING_TABLES item: ${trimmed}`);
    }
    result.set(caseNo, tableName.toLowerCase());
  }
  return result;
}

function padCaseNo(caseNo: number): string {
  return String(caseNo).padStart(2, "0");
}

function initializeOutputFiles(): void {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  if (readOutputInitRunKey(OUTPUT_INIT_MARKER) !== BATCH_RUN_KEY) {
    fs.writeFileSync(RESULT_JSONL, "");
    fs.writeFileSync(CREATED_RECORDS_JSONL, "");
    fs.writeFileSync(RESULT_SUMMARY_JSON, "");
    writeJsonFile(OUTPUT_INIT_MARKER, {
      runKey: BATCH_RUN_KEY,
      initializedAt: new Date().toISOString(),
    });
  }
  fs.writeFileSync(CASE_MAPPING_JSON, JSON.stringify(buildSelectedCaseMapping(), null, 2));
}

function readOutputInitRunKey(filePath: string): string | undefined {
  if (!fs.existsSync(filePath)) return undefined;
  const raw = fs.readFileSync(filePath, "utf8").trim();
  if (!raw.startsWith("{")) return undefined;
  const parsed = JSON.parse(raw) as { runKey?: unknown };
  return typeof parsed.runKey === "string" ? parsed.runKey : undefined;
}

function writeJsonFile(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function ruleFingerprint(rule: V6411RuleSpec): string {
  return [
    rule.category,
    rule.scope ?? "",
    (rule.fields ?? []).join(","),
    rule.fieldLogic ?? "",
    rule.functionName,
    rule.filter ?? "",
    rule.method ?? "",
    rule.expected ?? "",
    rule.strength,
    rule.unmergeable ? "UNMERGEABLE" : "",
  ].join("|||");
}

function needsCompareTable(build: UiCaseBuild): boolean {
  return build.ruleSpec.rules.some(ruleUsesCompareTable);
}

function ruleUsesCompareTable(rule: V6411RuleSpec): boolean {
  return ["多表唯一性判断", "多表数据行数对比", "多表数据一致性比对"].includes(rule.functionName);
}

function recordCreationProgress(build: UiCaseBuild, stage: string, sourceRef: string): void {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const record = {
    generatedAt: new Date().toISOString(),
    sourceRef,
    stage,
    caseNo: build.caseNo,
    sourceCaseId: build.sourceCaseId,
    datasourceName: build.datasourceName,
    datasourceType: build.datasourceType,
    database: build.database,
    tableName: build.tableName,
    fullTableName: build.fullTableName,
    compareTableName: build.compareTableName,
    fullCompareTableName: build.fullCompareTableName,
    ruleName: build.ruleName,
    fullTitle: build.fullTitle,
    packageName: build.packageName,
    packageCount: build.packageCount,
    samplingEnabled: build.samplingEnabled,
    partitionEnabled: build.partitionEnabled,
    expectedRuleCount: build.ruleSpec.expectedRuleCount,
  };
  fs.appendFileSync(CREATED_RECORDS_JSONL, `${JSON.stringify(record)}\n`);
  console.log(
    `[v6411-ui-rebuild] ${stage} §${padCaseNo(build.caseNo)} ${build.datasourceName} ${build.fullTableName} ${build.ruleName}`,
  );
}

function loadLatestResultRecordsByCaseNo(selectedCases: number[]): Map<number, UiResultRecord> {
  const records = new Map<number, UiResultRecord>();
  if (!fs.existsSync(RESULT_JSONL)) return records;
  const selected = new Set(selectedCases);
  for (const line of fs.readFileSync(RESULT_JSONL, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    const record = parseUiResultRecord(line);
    if (!record || !selected.has(record.caseNo)) continue;
    records.set(record.caseNo, record);
  }
  return records;
}

function parseUiResultRecord(line: string): UiResultRecord | undefined {
  try {
    const parsed = JSON.parse(line) as Partial<UiResultRecord>;
    if (!parsed || typeof parsed !== "object") return undefined;
    if (!Number.isFinite(parsed.caseNo)) return undefined;
    if (!parsed.result?.classification) return undefined;
    return parsed as UiResultRecord;
  } catch {
    return undefined;
  }
}

function summarizeResultRecords(records: UiResultRecord[]): {
  generatedAt: string;
  selectedCaseCount: number;
  counts: Record<UiResultStatus, number>;
  byDatasource: Record<string, { total: number; counts: Record<UiResultStatus, number> }>;
  rows: UiResultRecord[];
} {
  const emptyCounts = (): Record<UiResultStatus, number> => ({
    "validation-pass": 0,
    "validation-unpass": 0,
    "run-failed": 0,
    running: 0,
    unknown: 0,
  });
  const counts = emptyCounts();
  const byDatasource: Record<string, { total: number; counts: Record<UiResultStatus, number> }> = {};
  for (const record of records) {
    expectResultRecordShape(record);
    counts[record.result.classification] += 1;
    const datasource = (byDatasource[record.datasourceName] ??= { total: 0, counts: emptyCounts() });
    datasource.total += 1;
    datasource.counts[record.result.classification] += 1;
  }
  return {
    generatedAt: new Date().toISOString(),
    selectedCaseCount: records.length,
    counts,
    byDatasource,
    rows: records,
  };
}

function expectResultRecordShape(record: UiResultRecord): void {
  expect(record.ruleName.length, `§${padCaseNo(record.caseNo)} 结果记录里的 UI 短名必须不超过 50 字`).toBeLessThanOrEqual(50);
  expect(record.ruleName, `§${padCaseNo(record.caseNo)} 结果记录里的 UI 短名不得保留中文书名号`).not.toMatch(/[「」【】]/);
  expect(record.fullTitle, `§${padCaseNo(record.caseNo)} 结果记录必须保留完整用例标题`).toMatch(/^验证/);
  expect(record.tableName, `§${padCaseNo(record.caseNo)} 结果记录必须包含批次唯一表名`).toMatch(
    new RegExp(`^test_info_1_[a-z]{8}_${padCaseNo(record.caseNo)}$`),
  );
  expect(record.compareTableName, `§${padCaseNo(record.caseNo)} 结果记录必须包含独立对比表名`).toBe(
    `${record.tableName}_cmp`,
  );
  expect(typeof record.samplingEnabled, `§${padCaseNo(record.caseNo)} 结果记录必须包含抽样开关设置`).toBe("boolean");
  expect(typeof record.partitionEnabled, `§${padCaseNo(record.caseNo)} 结果记录必须包含分区设置`).toBe("boolean");
}

function shanghaiDate(offsetDays = 0): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const byType = new Map(parts.map((part) => [part.type, part.value]));
  return `${byType.get("year")}-${byType.get("month")}-${byType.get("day")}`;
}

function tablePartitionDate(): string {
  const configured = process.env.V6411_UI_TABLE_PARTITION?.trim();
  if (configured) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(configured)) {
      throw new Error(`V6411_UI_TABLE_PARTITION 必须是 yyyy-MM-dd，实际为 ${configured}`);
    }
    return configured;
  }
  return shanghaiDate();
}

function datasourceUiLabel(build: UiCaseBuild): string {
  const uiType =
    build.datasourceType === "Doris3.x"
      ? (process.env.V6411_UI_DORIS_TYPE?.trim() || "Doris3.x")
      : build.datasourceType;
  if (!uiType) throw new Error("V6411_UI_DORIS_TYPE 不能为空");
  return `${build.datasourceName}（${uiType}）`;
}

async function createBaseTable(page: Page, build: UiCaseBuild, sourceRef: string): Promise<void> {
  if (build.datasourceType === "SparkThrift2.x") {
    throw new Error(
      `${sourceRef}: SparkThrift 禁止由 Playwright/CLI/API 建表；请先手工执行 automation/sql/lindorm-test_info_1.sql，并设置 V6411_UI_SKIP_BASE_TABLE_CREATE=1`,
    );
  }
  await createDorisBaseTable(page, build, sourceRef);
}

async function createDorisBaseTable(page: Page, build: UiCaseBuild, sourceRef: string): Promise<void> {
  await gotoDataQualityPage(page, "/dq/ruleSet");
  const statements = dorisBaseTableStatements(build, build.tableName);
  if (needsCompareTable(build)) {
    statements.push(...dorisBaseTableStatements(build, build.compareTableName));
  }
  await executeDorisSqlDirect(statements, build, sourceRef);
  test.info().annotations.push({ type: "table", description: build.fullTableName });
  if (needsCompareTable(build)) test.info().annotations.push({ type: "compare-table", description: build.fullCompareTableName });
}

function dorisBaseTableStatements(build: UiCaseBuild, tableName: string): string[] {
  const today = shanghaiDate();
  const tomorrow = shanghaiDate(1);
  const partitionName = `p${today.replace(/-/g, "")}`;
  const full = dorisQualifiedName(build.database, tableName);
  const ddl = `CREATE TABLE ${full} (
  id INT,
  dt DATE,
  age INT,
  string_num VARCHAR(32),
  name VARCHAR(64),
  address VARCHAR(128),
  money VARCHAR(32),
  buy_date DATE,
  date_detail VARCHAR(64)
)
DUPLICATE KEY(id, dt)
PARTITION BY RANGE(dt) (
  PARTITION ${partitionName} VALUES [("${today}"), ("${tomorrow}"))
)
DISTRIBUTED BY HASH(id) BUCKETS 1
PROPERTIES ("replication_num" = "1")`;
  const insert = `INSERT INTO ${full} (id, dt, age, string_num, name, address, money, buy_date, date_detail) VALUES
${baseRowsForV6411Case(build).map((row) => dorisRowValues(row, today)).join(",\n")}`;
  return [`DROP TABLE IF EXISTS ${full}`, ddl, insert];
}

async function executeDorisSqlDirect(
  statements: readonly string[],
  build: UiCaseBuild,
  sourceRef: string,
): Promise<void> {
  const sqlPath = path.join(OUT_DIR, `${build.tableName}.sql`);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(sqlPath, `${statements.map((item) => item.trim().replace(/;$/, "")).join(";\n")};\n`);

  const connectionOptions = dorisConnectionOptions();
  const executions = [];
  const connection = await createConnection(connectionOptions);
  try {
    for (const [index, statement] of statements.entries()) {
      const statementSql = statement.trim().replace(/;$/, "");
      const statementPath = path.join(OUT_DIR, `${build.tableName}-${String(index + 1).padStart(2, "0")}.sql`);
      fs.writeFileSync(statementPath, `${statementSql};\n`);
      try {
        await connection.query(statementSql);
        executions.push({
          index: index + 1,
          mode: "direct-doris-jdbc",
          status: 0,
          sqlPath: statementPath,
          sql: `${statementSql};\n`,
        });
      } catch (error) {
        executions.push({
          index: index + 1,
          mode: "direct-doris-jdbc",
          status: 1,
          sqlPath: statementPath,
          sql: `${statementSql};\n`,
          error: error instanceof Error ? error.message : String(error),
        });
        break;
      }
    }
  } finally {
    await connection.end();
  }

  await test.info().attach("base-table-sql-exec.json", {
    body: JSON.stringify(
      {
        sqlPath,
        sourceRef,
        datasource: {
          mode: "direct-doris-jdbc",
          dataInfoId: 753,
          qualitySourceId: 617,
          host: connectionOptions.host,
          port: connectionOptions.port,
          database: connectionOptions.database,
          user: connectionOptions.user,
        },
        executions,
      },
      null,
      2,
    ),
    contentType: "application/json",
  });

  const failed = executions.find((item) => item.status !== 0);
  expect(
    failed,
    `${sourceRef}: Doris 底层建表必须写入当前环境质量项目，失败语句=${
      failed?.index ?? "none"
    } error=${failed?.error ?? ""}`,
  ).toBeUndefined();
}

function dorisQualifiedName(database: string, tableName: string): string {
  return `\`${database}\`.\`${tableName}\``;
}

function dorisConnectionOptions(): ConnectionOptions {
  const jdbcUrl = process.env.V6411_DORIS_JDBC_URL;
  if (!jdbcUrl) throw new Error("Doris 底层建表仅允许使用显式 V6411_DORIS_JDBC_URL，不提供旧环境回退");
  const match = /^jdbc:mysql:\/\/([^:/]+):(\d+)\/([^?;]+)/.exec(jdbcUrl);
  if (!match) throw new Error(`无法解析 V6411_DORIS_JDBC_URL: ${jdbcUrl}`);
  return {
    host: match[1],
    port: Number(match[2]),
    database: match[3],
    user: process.env.V6411_DORIS_USER ?? "root",
    password: process.env.V6411_DORIS_PASSWORD ?? "",
    connectTimeout: Number(process.env.V6411_DORIS_CONNECT_TIMEOUT_MS ?? 30_000),
    multipleStatements: false,
  };
}

function dorisRowValues(rowValue: V6411BaseTableRow, dt: string): string {
  return `(${sqlNumber(rowValue.id)}, '${dt}', ${sqlNumber(rowValue.age)}, ${sqlString(rowValue.stringNum)}, ${sqlString(rowValue.name)}, ${sqlString(rowValue.address)}, ${sqlString(rowValue.money)}, '${shanghaiDate(rowValue.buyDateOffset)}', ${sqlString(rowValue.dateDetail)})`;
}

function sqlNumber(value: number | null): string {
  return value === null ? "NULL" : String(value);
}

function sqlString(value: string | null): string {
  if (value === null) return "NULL";
  return `'${value.replace(/'/g, "''")}'`;
}

async function createRuleSetViaUi(page: Page, build: UiCaseBuild, sourceRef: string): Promise<void> {
  await gotoDataQualityPage(page, "/dq/ruleSet");
  const existingRuleSetRow = await existingRuleSetTableRowInProbePage(page, build, sourceRef);
  if (existingRuleSetRow) {
    await test.info().attach(`${sourceRef}-existing-rule-set-precondition.txt`, {
      body: [
        "当前用例要求通过新建规则集 UI 创建本批次记录，但目标数据表已经绑定规则集。",
        "产品会将已配置规则集的数据表从新建规则集的可选列表中排除。",
        `table=${build.tableName}`,
        `existingRow=${existingRuleSetRow}`,
        "未删除、编辑或复用已有业务记录。",
      ].join("\n"),
      contentType: "text/plain",
    });
    throw new Error(
      `${sourceRef}: 数据表 ${build.tableName} 已存在规则集，产品新建规则集下拉会排除该表；需先通过 UI 清理旧规则集，或明确授权 UI 复用已有记录。existingRow=${existingRuleSetRow}`,
    );
  }
  await clickText(page, "新建规则集", sourceRef);
  await expect(page, `${sourceRef}: 应进入新增规则集页面`).toHaveURL(/\/dq\/ruleSet\/add/, { timeout: 30_000 });
  await selectExactFormOption(page, "选择数据源", datasourceUiLabel(build), sourceRef);
  await selectExactFormOption(page, "选择数据库", build.database, sourceRef);
  await selectRuleSetDataTableFormOption(page, build.tableName, sourceRef);
  await fillPageFormField(page, /规则集描述/, build.ruleName, sourceRef);
  await fillRuleSetPackageName(page, build.packageName, sourceRef);
  await clickButton(page, /^下\s*一\s*步$/, sourceRef, { waitForSpin: false });
  await expect(page.locator("body"), `${sourceRef}: 规则集应进入监控规则配置`).toContainText(/新增规则包|添加规则/, {
    timeout: 30_000,
  });
  await ensureRuleSetPackageReady(page, build.packageName, sourceRef);

  for (const rule of build.ruleSpec.rules) {
    await test.step(`新增监控规则${rule.index}: ${rule.category}/${rule.functionName}`, async () => {
      await addRuleToCurrentRuleSet(page, build, rule, sourceRef);
    });
  }

  recordCreationProgress(build, "rule-set-save-attempted", sourceRef);
  await clickRuleSetSave(page, sourceRef, build);
  recordCreationProgress(build, "rule-set-save-finished", sourceRef);
}

async function countRuleSetRecordsViaUi(page: Page, build: UiCaseBuild, sourceRef: string): Promise<number> {
  await gotoDataQualityPage(page, "/dq/ruleSet");
  await searchTable(page, build.tableName, sourceRef);
  const totalText = await page.locator(".ant-pagination-total-text:visible").last().innerText({ timeout: 3_000 }).catch(() => "");
  const total = Number(totalText.match(/共\s*(\d+)\s*条/)?.[1] ?? 0);
  const maxPages = total ? Math.max(1, Math.ceil(total / 20)) : 5;
  let count = 0;
  for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
    const rows = page.locator(".ant-table-tbody tr:visible").filter({ hasText: build.tableName });
    count += await rows.count();
    const next = page.locator(".ant-pagination-next:visible").last();
    const nextClass = await next.getAttribute("class").catch(() => "");
    if (!(await next.isVisible({ timeout: 1_000 }).catch(() => false)) || nextClass?.includes("ant-pagination-disabled")) break;
    await next.click({ timeout: 30_000 });
    await waitForSpin(page, sourceRef);
  }
  return count;
}

async function editRuleSetViaUi(page: Page, build: UiCaseBuild, sourceRef: string): Promise<void> {
  await gotoDataQualityPage(page, "/dq/ruleSet");
  await searchTable(page, build.tableName, sourceRef);
  const row = await findRuleSetRowAcrossPages(page, build, sourceRef);
  if (!row) throw new Error(`${sourceRef}: 编辑前规则集列表应展示目标记录`);
  await expect(row, `${sourceRef}: 已有规则集应展示数据源 ${build.datasourceName}`).toContainText(build.datasourceName, {
    timeout: 30_000,
  });
  const edit = row.getByRole("button", { name: /^编\s*辑$/ }).or(row.getByText(/^编辑$/)).first();
  await expect(edit, `${sourceRef}: 已有规则集行应展示编辑入口`).toBeVisible({ timeout: 30_000 });
  await edit.click({ timeout: 30_000 });
  await waitForSpin(page, sourceRef);
  await expect(page.locator("body"), `${sourceRef}: 规则集编辑页面应打开`).toContainText(/编辑规则集|监控规则|规则包/, {
    timeout: 30_000,
  });
  await advanceRuleSetEditToSave(page, sourceRef);
  await clickRuleSetSave(page, sourceRef, build);
  await expect(page.locator("body"), `${sourceRef}: 规则集编辑保存后应返回管理列表`).toContainText(/规则集管理/, {
    timeout: 60_000,
  });
}

async function advanceRuleSetEditToSave(page: Page, sourceRef: string): Promise<void> {
  const save = page.locator("button:visible").filter({ hasText: /^保\s*存$/ }).last();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (await save.isVisible({ timeout: 2_000 }).catch(() => false)) return;
    const next = page.locator("button:visible").filter({ hasText: /^下\s*一\s*步$/ }).last();
    await expect(next, `${sourceRef}: 规则集编辑应展示下一步`).toBeVisible({ timeout: 30_000 });
    await next.click({ force: true, timeout: 30_000 });
    await waitForSpin(page, sourceRef);
    await page.waitForTimeout(500);
  }
  await expect(save, `${sourceRef}: 规则集编辑下一步后应展示保存按钮`).toBeVisible({ timeout: 30_000 });
}

async function existingRuleSetTableRowInProbePage(
  page: Page,
  build: UiCaseBuild,
  sourceRef: string,
): Promise<string | null> {
  const probe = await page.context().newPage();
  try {
    await gotoDataQualityPage(probe, "/dq/ruleSet");
    await searchTable(probe, build.tableName, sourceRef);
    const rows = probe.locator(".ant-table-tbody tr").filter({ hasText: build.tableName });
    const count = await rows.count();
    if (count === 0) return null;
    const row = count === 1 ? rows : rows.first();
    return ((await row.innerText({ timeout: 5_000 }).catch(() => "")) ?? "").replace(/\s+/g, " ").trim() || null;
  } catch (error) {
    await test.info().attach(`${sourceRef}-probe-existing-rule-set-table-error.txt`, {
      body: error instanceof Error ? error.stack ?? error.message : String(error),
      contentType: "text/plain",
    });
    return null;
  } finally {
    await probe.close().catch(() => {});
  }
}

async function ensureCustomSqlTemplateViaUi(page: Page, sourceRef: string): Promise<void> {
  const templateName = "自定义规则测试";
  await gotoDataQualityPage(page, "/dq/ruleBase");
  await openCustomSqlTemplateTab(page, sourceRef);
  await searchCustomSqlTemplate(page, templateName, sourceRef);
  if (await customSqlTemplateRow(page, templateName).isVisible({ timeout: 3_000 }).catch(() => false)) return;

  await clickButton(page, /新增自定义sql模版|新增自定义SQL模板/i, sourceRef);
  await expect(page, `${sourceRef}: 新增自定义 SQL 模板应进入 sqlAdd 页面`).toHaveURL(/\/dq\/ruleBase\/sqlAdd/, {
    timeout: 30_000,
  });
  await page.locator("#ruleName").fill(templateName, { timeout: 30_000 });
  await page.locator("#ruleDesc").fill("测试规则", { timeout: 30_000 });
  await selectFormOption(page, /规则分类/, "完整性校验", sourceRef);
  await selectFormOption(page, /关联范围/, "字段", sourceRef);

  const sql = "select * from ${tableName} where ${colName} = ${value}";
  const editor = page.locator(".monaco-editor textarea").first();
  await expect(editor, `${sourceRef}: 自定义 SQL 编辑器应可见`).toBeVisible({ timeout: 30_000 });
  await editor.click({ timeout: 30_000 });
  await page.keyboard.insertText(sql);
  await expect(page.locator("body"), `${sourceRef}: 自定义 SQL 模板应回显 SQL`).toContainText("select * from", {
    timeout: 30_000,
  });

  await setCustomSqlParameterType(page, "tableName", "当前校验表", sourceRef);
  await setCustomSqlParameterType(page, "colName", "当前校验表字段", sourceRef);
  await setCustomSqlParameterType(page, "value", "自定义参数", sourceRef);

  await clickButton(page, /^新\s*增$/, sourceRef, { last: true });
  await waitForSpin(page, sourceRef);
  await expect(page.locator("body"), `${sourceRef}: 自定义 SQL 模板通过 UI 新增后应提示成功或返回列表`).toContainText(
    /成功|自定义sql模版|自定义SQL模板|规则库配置/,
    { timeout: 60_000 },
  );
  await gotoDataQualityPage(page, "/dq/ruleBase");
  await openCustomSqlTemplateTab(page, sourceRef);
  await searchCustomSqlTemplate(page, templateName, sourceRef);
  await expect(customSqlTemplateRow(page, templateName), `${sourceRef}: 规则库应展示自定义 SQL 模板 ${templateName}`).toBeVisible({
    timeout: 30_000,
  });
}

async function openCustomSqlTemplateTab(page: Page, sourceRef: string): Promise<void> {
  const tab = page.locator(".ant-tabs-tab:visible").filter({ hasText: /自定义sql模版|自定义SQL模板/i }).first();
  await expect(tab, `${sourceRef}: 规则库配置应展示自定义 SQL 模板 tab`).toBeVisible({ timeout: 30_000 });
  await tab.click({ timeout: 30_000 });
  await waitForSpin(page, sourceRef);
  await expect(page.locator("body"), `${sourceRef}: 自定义 SQL 模板列表应可见`).toContainText(/新增自定义sql模版|规则名称/, {
    timeout: 30_000,
  });
}

async function searchCustomSqlTemplate(page: Page, templateName: string, sourceRef: string): Promise<void> {
  const input = page.locator("input[placeholder='请输入规则名称进行搜索']:visible, input[placeholder*='规则名称']:visible").first();
  await expect(input, `${sourceRef}: 自定义 SQL 模板列表应展示规则名称搜索框`).toBeVisible({ timeout: 30_000 });
  await input.fill(templateName, { timeout: 30_000 });
  await page.keyboard.press("Enter").catch(() => {});
  const search = page.getByRole("button", { name: /查\s*询|search/i }).or(page.locator(".anticon-search").first()).first();
  if (await search.isVisible({ timeout: 2_000 }).catch(() => false)) await search.click({ timeout: 30_000 }).catch(() => {});
  await waitForSpin(page, sourceRef);
}

function customSqlTemplateRow(page: Page, templateName: string): Locator {
  return page.locator(".ant-table-tbody tr:visible").filter({ hasText: templateName }).first();
}

async function setCustomSqlParameterType(
  page: Page,
  paramName: string,
  typeLabel: string,
  sourceRef: string,
): Promise<void> {
  const row = page.locator(".ant-table-tbody tr:visible").filter({ hasText: `\${${paramName}}` }).first();
  await expect(row, `${sourceRef}: 自定义 SQL 参数 ${paramName} 应解析成行`).toBeVisible({ timeout: 30_000 });
  const select = row.locator(".ant-select:visible").first();
  await expect(select, `${sourceRef}: 自定义 SQL 参数 ${paramName} 应展示类型下拉`).toBeVisible({ timeout: 30_000 });
  await chooseFromSelect(page, select, typeLabel, sourceRef);
  const nameInput = row.getByPlaceholder("请输入参数名称").first();
  if (
    (await nameInput.isVisible({ timeout: 2_000 }).catch(() => false)) &&
    (await nameInput.isEnabled({ timeout: 1_000 }).catch(() => false))
  ) {
    await nameInput.fill(paramName, { timeout: 30_000 });
  }
  const descInput = row.getByPlaceholder("请输入参数说明").first();
  if (
    (await descInput.isVisible({ timeout: 2_000 }).catch(() => false)) &&
    (await descInput.isEnabled({ timeout: 1_000 }).catch(() => false))
  ) {
    await descInput.fill(paramName, { timeout: 30_000 });
  }
}

async function fillRuleSetPackageName(page: Page, packageName: string, sourceRef: string): Promise<void> {
  const input = page.getByPlaceholder("请输入规则包名称").first();
  await expect(input, `${sourceRef}: 规则集基础信息应展示规则包名称输入框`).toBeVisible({ timeout: 30_000 });
  await input.fill(packageName, { timeout: 30_000 });
  await expect(input, `${sourceRef}: 规则包名称应回显`).toHaveValue(packageName, { timeout: 30_000 });
}

async function ensureRuleSetPackageReady(page: Page, packageName: string, sourceRef: string): Promise<void> {
  if (await page.getByText("添加规则", { exact: true }).first().isVisible({ timeout: 2_000 }).catch(() => false)) return;
  await clickButton(page, /新增规则包|添加规则包|增加/, sourceRef);
  const input = page.getByPlaceholder("请输入规则包名称").last();
  if (await input.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await input.fill(packageName, { timeout: 30_000 });
    await input.press("Tab");
  } else {
    const select = page.locator(".ant-select:visible").filter({ hasText: /请选择规则包名称|规则包/ }).last();
    await expect(select, `${sourceRef}: 应展示规则包名称选择框`).toBeVisible({ timeout: 30_000 });
    await select.click({ force: true, timeout: 30_000 });
    await page.keyboard.type(packageName);
    await page.keyboard.press("Enter");
  }
  await expect(page.locator("body"), `${sourceRef}: 规则包应可添加规则`).toContainText("添加规则", { timeout: 30_000 });
}

async function addRuleToCurrentRuleSet(
  page: Page,
  build: UiCaseBuild,
  rule: V6411RuleSpec,
  sourceRef: string,
): Promise<void> {
  const categoryText = isCustomSqlRule(rule) ? "自定义SQL" : rule.category.replace(/校验$/, "");
  const ruleForm = await addRuleFormShell(page, categoryText, sourceRef);
  await expect(ruleForm, `${sourceRef}: 规则 ${rule.index} 应打开配置区`).toContainText(
    /规则描述|强弱规则|生效范围|统计函数|规则类型/,
    { timeout: 30_000 },
  );

  if (rule.scope) {
    await selectFieldOption(ruleForm, /生效范围|规则范围|校验类型/, rule.scope, sourceRef, { required: false });
  }
  if (rule.index === 1) {
    await attachRuleFormDebug(ruleForm, `${sourceRef}-rule-${rule.index}-after-scope`);
  }
  if (isCustomSqlRule(rule)) {
    await configureCustomSqlRule(ruleForm, build, sourceRef);
  } else if (!isRuleSpecificStatisticHandled(rule)) {
    await selectStatisticFunction(ruleForm, rule.functionName, sourceRef);
  }
  for (const field of rule.fields ?? []) {
    await selectRuleField(ruleForm, field, sourceRef);
  }
  if (rule.fieldLogic) {
    await selectAnyOption(ruleForm, /字段间规则逻辑|字段逻辑|逻辑关系/, rule.fieldLogic, sourceRef, ["且", "或"]);
  } else if ((rule.fields?.length ?? 0) > 1) {
    await selectAnyOption(ruleForm, /字段间规则逻辑|字段逻辑|逻辑关系/, "且", sourceRef, ["and"]);
  }
  if (rule.filter) {
    await configureRuleFilter(ruleForm, rule.filter, sourceRef);
  }
  await configureRuleSpecificFields(ruleForm, build, rule, sourceRef);
  if (rule.method && !isRuleSpecificMethodHandled(rule)) {
    await selectFieldOption(ruleForm, /校验方法|比较方式|判断方式|对比方法/, rule.method, sourceRef, { required: false });
  }
  if (rule.expected && !isRuleSpecificExpectedHandled(rule)) {
    await fillExpectedValue(ruleForm, rule.expected, sourceRef);
  }
  await selectFieldOption(ruleForm, /强弱规则/, rule.strength, sourceRef);
  await fillRuleDescription(ruleForm, "测试规则", sourceRef);
  console.log(`[v6411-ui-rebuild] rule-configured ${sourceRef} #${rule.index} ${rule.category}/${rule.functionName}`);
}

function isCustomSqlRule(rule: V6411RuleSpec): boolean {
  return rule.category === "自定义SQL" || rule.functionName === "自定义规则测试";
}

async function addRuleFormShell(page: Page, categoryText: string, sourceRef: string): Promise<Locator> {
  const ruleForms = page.locator(".ruleForm__form:visible");
  const beforeCount = await ruleForms.count();
  const beforeLastText =
    beforeCount > 0
      ? ((await ruleForms
          .last()
          .innerText({ timeout: 1_000 })
          .catch(() => "")) ?? "").replace(/\s+/g, " ")
      : "";
  const addButton = page.getByRole("button", { name: /添加规则/ }).or(page.locator("button").filter({ hasText: /添加规则/ })).first();
  await expect(addButton, `${sourceRef}: 规则包应展示添加规则按钮`).toBeVisible({ timeout: 30_000 });
  await addButton.click({ timeout: 30_000 });
  const dropdown = page.locator(".ant-dropdown:visible, .ant-dropdown-menu:visible, .ant-popover:visible").last();
  await expect(dropdown, `${sourceRef}: 添加规则下拉菜单应展开`).toBeVisible({ timeout: 30_000 });
  const category = dropdown.getByText(categoryText, { exact: false }).last();
  await expect(category, `${sourceRef}: 添加规则菜单应包含 ${categoryText}`).toBeVisible({ timeout: 30_000 });
  await category.click({ timeout: 30_000 });
  await waitForSpin(page, sourceRef);
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const count = await ruleForms.count();
    if (count > 0) {
      const candidate = ruleForms.last();
      const text = ((await candidate.innerText({ timeout: 500 }).catch(() => "")) ?? "").replace(/\s+/g, " ");
      const looksLikeRuleForm = /规则描述|强弱规则|生效范围|统计函数|规则类型/.test(text);
      const changedFromPreviousForm = count > beforeCount || text !== beforeLastText;
      if (looksLikeRuleForm && changedFromPreviousForm) {
        await page.waitForTimeout(300);
        await candidate.scrollIntoViewIfNeeded().catch(() => {});
        return ruleForms.last();
      }
    }
    await page.waitForTimeout(500);
  }
  const finalCount = await ruleForms.count().catch(() => -1);
  throw new Error(`${sourceRef}: 添加 ${categoryText} 规则后未出现稳定的新规则表单，新增前=${beforeCount}，当前=${finalCount}`);
}

async function attachRuleFormDebug(ruleForm: Locator, name: string): Promise<void> {
  const debug = await ruleForm
    .evaluate((form) => {
      const normalize = (value: string | null | undefined) => (value ?? "").replace(/\s+/g, " ").trim();
      const describeSelect = (select: Element, index: number) => {
        const input = select.querySelector("input");
        return {
          index,
          text: normalize(select.textContent),
          title: normalize(select.getAttribute("title")),
          className: normalize(select.getAttribute("class")),
          inputRole: normalize(input?.getAttribute("role")),
          inputPlaceholder: normalize(input?.getAttribute("placeholder")),
          inputValue: normalize((input as HTMLInputElement | null)?.value),
          selectedItem: normalize(select.querySelector(".ant-select-selection-item")?.textContent),
          placeholder: normalize(select.querySelector(".ant-select-selection-placeholder")?.textContent),
        };
      };
      return {
        formText: normalize(form.textContent),
        formItems: Array.from(form.querySelectorAll(".ant-form-item")).map((item, index) => ({
          index,
          text: normalize(item.textContent),
          labels: Array.from(item.querySelectorAll("label")).map((label) => normalize(label.textContent)),
          selects: Array.from(item.querySelectorAll(".ant-select")).map(describeSelect),
          inputs: Array.from(item.querySelectorAll("input, textarea")).map((input, inputIndex) => ({
            index: inputIndex,
            placeholder: normalize(input.getAttribute("placeholder")),
            value: normalize((input as HTMLInputElement | HTMLTextAreaElement).value),
          })),
        })),
        selects: Array.from(form.querySelectorAll(".ant-select")).map(describeSelect),
      };
    })
    .catch((error) => ({ error: error instanceof Error ? error.message : String(error) }));
  await test.info().attach(`${name}-rule-form-debug.json`, {
    body: JSON.stringify(debug, null, 2),
    contentType: "application/json",
  });
}

async function configureCustomSqlRule(root: UiSearchRoot, build: UiCaseBuild, sourceRef: string): Promise<void> {
  await selectAnyOption(root, /生效范围|关联范围/, "字段级", sourceRef, ["字段"]);
  await selectFieldOption(root, /规则分类|规则类型|分类/, "完整性校验", sourceRef, { required: false });
  await selectCustomSqlReferenceRule(root, "自定义规则测试", sourceRef);
  // 自定义规则 SQL 编辑器在当前环境为只读，选择已有规则后只填参数，避免触发只读编辑器告警。
  await fillParameterLikeInput(root, "tableName", build.fullTableName, sourceRef, { required: true });
  await fillParameterLikeInput(root, "colName", "id", sourceRef, { required: true });
  await selectTextLabeledOption(root, "校验字段", "id", sourceRef);
  await fillParameterLikeInput(root, "value", "1", sourceRef, { required: true });
  await selectFieldOption(root, /校验方法/, "固定值", sourceRef);
  await selectFieldOption(root, /期望值/, "=", sourceRef);
  await fillNthNumberInput(root, 0, "1", sourceRef);
}

async function selectCustomSqlReferenceRule(root: UiSearchRoot, templateName: string, sourceRef: string): Promise<void> {
  for (const label of [/引用规则|选择规则|规则名称/, /自定义SQL模板|自定义SQL模版/]) {
    const field = root.locator(".ant-form-item:visible, .ant-row:visible").filter({ hasText: label }).last();
    if (!(await field.isVisible({ timeout: 1_000 }).catch(() => false))) continue;
    const selects = field.locator(".ant-select:visible");
    for (let index = (await selects.count()) - 1; index >= 0; index -= 1) {
      if (await chooseFromSelect(rootPage(root), selects.nth(index), templateName, sourceRef, { required: false, maxScrollAttempts: 5 })) return;
    }
  }

  const selects = root.locator(".ant-select:visible");
  for (let index = (await selects.count()) - 1; index >= 0; index -= 1) {
    if (await chooseFromSelect(rootPage(root), selects.nth(index), templateName, sourceRef, { required: false, maxScrollAttempts: 5 })) return;
  }
  await attachRuleFormDebug(root as Locator, `${sourceRef}-custom-sql-reference-missing`);
  throw new Error(`${sourceRef}: 自定义 SQL 规则表单内未找到引用规则 ${templateName}`);
}

async function configureRuleSpecificFields(
  root: UiSearchRoot,
  build: UiCaseBuild,
  rule: V6411RuleSpec,
  sourceRef: string,
): Promise<void> {
  switch (rule.functionName) {
    case "数值-取值范围":
      await configureNumericRangeExpected(root, rule, sourceRef);
      break;
    case "数值-枚举个数":
      await configureNumericEnumCountExpected(root, rule, sourceRef);
      break;
    case "枚举值":
      await configureEnumValueExpected(root, rule, sourceRef);
      break;
    case "取值范围&枚举范围":
      await configureRangeAndEnumExpected(root, rule, sourceRef);
      break;
    case "字符串长度":
      await configureStringLengthExpected(root, expectedNumericValue(rule.expected) ?? "1", sourceRef);
      break;
    case "重复数":
      await configureFixedValueStatisticExpected(
        root,
        "重复数",
        expectedOperator(rule.expected) ?? "=",
        expectedNumericValue(rule.expected) ?? "0",
        sourceRef,
      );
      break;
    case "多表唯一性判断":
      await ensureStatisticFunction(root, "多表唯一性判断", sourceRef);
      await selectFieldOption(root, /校验字段逻辑/, "唯一", sourceRef, { required: false });
      await selectFieldOption(root, /和其他表的校验关系|校验关系/, "且", sourceRef, { required: false });
      await configureCompareTableRow(root, build.compareTableName, "id", sourceRef);
      break;
    case "多表数据行数对比":
      await configureTableRowCountCompare(root, build.database, build.compareTableName, sourceRef);
      break;
    case "数据精度":
      await configureDataPrecision(root, rule, sourceRef);
      break;
    case "异常值检测":
      await configureFixedValueStatisticExpected(
        root,
        "异常值检测",
        expectedOperator(rule.expected) ?? "=",
        expectedNumericValue(rule.expected) ?? "1",
        sourceRef,
        rule.method ?? "IQR离群点数量",
      );
      break;
    case "多表数据一致性比对":
      await selectFieldOption(root, /校验类型|规则类型/, "多表数据一致性比对", sourceRef, { required: false });
      await selectFieldOption(root, /选择校验表主键|校验表主键|主表主键|主键/, "id", sourceRef, { required: false });
      await configureConsistencyCompareTable(root, build.compareTableName, sourceRef);
      await configureConsistencyFieldMappings(root, ["id", "name"], sourceRef);
      break;
    case "周期性校验（单字段时间差校验）":
      await selectFieldOption(root, /排序字段|选择排序字段/, "id", sourceRef, { required: false });
      await configureSingleFieldTimeDiff(root, sourceRef);
      break;
    case "及时性校验（多字段时间差校验）":
      await configureMultiFieldTimeDiff(root, ["buy_date", "dt"], sourceRef);
      break;
    case "数据变化趋势":
      await selectStatisticFunction(root, "数据变化趋势", sourceRef);
      await selectFieldOption(root, /排序字段|选择排序字段/, "id", sourceRef, { required: false });
      await selectFieldOption(root, /校验方法/, rule.method ?? "单调递增", sourceRef, { required: false });
      break;
    case "字段值计算对比":
      await selectStatisticFunction(root, "字段值计算对比", sourceRef);
      await selectFieldOption(root, /排序字段|选择排序字段/, "id", sourceRef, { required: false });
      const expression = "cast(string_num as double)*(id+age)";
      await configureCalculationLogic(root, expression, sourceRef);
      await selectFieldOption(root, /对比方法/, rule.method ?? "计算结果与字段对比", sourceRef, { required: false });
      await configureCalculationCompare(root, expression, sourceRef);
      break;
    default:
      break;
  }
}

async function configureDataPrecision(root: UiSearchRoot, rule: V6411RuleSpec, sourceRef: string): Promise<void> {
  const precision = parseDataPrecisionExpectation(rule);
  await selectStatisticFunction(root, "数据精度", sourceRef);
  await choosePlaceholderSelectByIndex(root, 0, precision.integerOperator, `${sourceRef}: 数据精度整数位操作符`);
  await fillNthNumberInput(root, 0, precision.integerDigits, sourceRef);
  await clickInlineRadio(root, "且", sourceRef);
  await choosePlaceholderSelectByIndex(root, 1, precision.decimalOperator, `${sourceRef}: 数据精度小数位操作符`);
  await fillNthNumberInput(root, 1, precision.decimalDigits, sourceRef);
}

function parseDataPrecisionExpectation(rule: V6411RuleSpec): {
  integerOperator: string;
  integerDigits: string;
  decimalOperator: string;
  decimalDigits: string;
} {
  const text = `${rule.expected ?? ""} ${rule.notes ?? ""}`;
  const slash = text.match(/数据精度[^\d]*(\d+)\s*\/\s*(\d+)/);
  if (slash?.[1] && slash[2]) {
    return {
      integerOperator: "=",
      integerDigits: slash[1],
      decimalOperator: "=",
      decimalDigits: slash[2],
    };
  }

  const integer = text.match(/小数点前最大位[^\d<>=!]*([!<>=]{1,2})?\s*(\d+)/);
  const decimal = text.match(/小数点后最大位[^\d<>=!]*([!<>=]{1,2})?\s*(\d+)/);
  return {
    integerOperator: integer?.[1] ?? "=",
    integerDigits: integer?.[2] ?? "3",
    decimalOperator: decimal?.[1] ?? "=",
    decimalDigits: decimal?.[2] ?? "2",
  };
}

async function configureNumericRangeExpected(root: UiSearchRoot, rule: V6411RuleSpec, sourceRef: string): Promise<void> {
  await expect(root.locator(".ant-select:visible").filter({ hasText: /数值-取值范围|取值范围/ }).first(), `${sourceRef}: 数值-取值范围统计规则应已选中`).toBeVisible({
    timeout: 30_000,
  });
  const range = parseRangeExpectation(rule, { firstOperator: ">", firstValue: "0", relation: "且", secondOperator: "<=", secondValue: "100" });
  await choosePlaceholderSelectByIndex(root, 0, range.firstOperator, `${sourceRef}: 数值范围第一操作符`);
  await fillNthNumberInput(root, 0, range.firstValue, sourceRef);
  if (range.secondOperator && range.secondValue) {
    await clickInlineRadio(root, range.relation, sourceRef);
    await choosePlaceholderSelectByIndex(root, 1, range.secondOperator, `${sourceRef}: 数值范围第二操作符`);
    await fillNthNumberInput(root, 1, range.secondValue, sourceRef);
  }
}

async function configureNumericEnumCountExpected(root: UiSearchRoot, rule: V6411RuleSpec, sourceRef: string): Promise<void> {
  await expect(root.locator(".ant-select:visible").filter({ hasText: /数值-枚举个数|枚举个数/ }).first(), `${sourceRef}: 数值-枚举个数统计规则应已选中`).toBeVisible({
    timeout: 30_000,
  });
  const simple = parseSimpleNumericExpectation(rule, { operator: ">=", value: "1" });
  await chooseNextPlaceholderSelect(root, "固定值", sourceRef);
  await chooseNextPlaceholderSelect(root, simple.operator, sourceRef);
  await fillNthNumberInput(root, 0, simple.value, sourceRef);
}

async function configureEnumValueExpected(root: UiSearchRoot, rule: V6411RuleSpec, sourceRef: string): Promise<void> {
  await expect(root.locator(".ant-select:visible").filter({ hasText: /^枚举值$/ }).first(), `${sourceRef}: 枚举值统计规则应已选中`).toBeVisible({
    timeout: 30_000,
  });
  const enumExpected = parseEnumExpectation(rule, { operator: "not in", values: ["25", "30", "28", "35"] });
  await chooseNextPlaceholderSelect(root, enumExpected.operator, sourceRef);
  await fillEnumTagValues(root, enumExpected.values, sourceRef);
}

async function configureRangeAndEnumExpected(root: UiSearchRoot, rule: V6411RuleSpec, sourceRef: string): Promise<void> {
  await expect(
    root.locator(".ant-select:visible").filter({ hasText: /取值范围&枚举范围|数值-取值范围/ }).first(),
    `${sourceRef}: 取值范围&枚举范围统计规则应已选中或映射为当前 UI 的数值-取值范围控件`,
  ).toBeVisible({ timeout: 30_000 });
  const range = parseRangeExpectation(rule, { firstOperator: ">", firstValue: "0", relation: "且", secondOperator: "<", secondValue: "5" });
  const rangeSection = await findRuleSectionByLabel(root, "取值范围设置：", sourceRef, { required: false });
  if (rangeSection) {
    await chooseSectionSelect(rangeSection, 0, range.firstOperator, `${sourceRef}: 取值范围第一操作符`);
    await fillSectionNumberInput(rangeSection, 0, range.firstValue, `${sourceRef}: 取值范围第一期望值`);
    if (range.secondOperator && range.secondValue) {
      await clickSectionRadio(rangeSection, range.relation, `${sourceRef}: 取值范围条件关系`);
      await chooseSectionSelect(rangeSection, 1, range.secondOperator, `${sourceRef}: 取值范围第二操作符`);
      await fillSectionNumberInput(rangeSection, 1, range.secondValue, `${sourceRef}: 取值范围第二期望值`);
    }
  } else {
    await choosePlaceholderSelectByIndex(root, 0, range.firstOperator, `${sourceRef}: 取值范围第一操作符`);
    await fillNthNumberInput(root, 0, range.firstValue, sourceRef);
    if (range.secondOperator && range.secondValue) {
      await clickInlineRadio(root, range.relation, sourceRef);
      await choosePlaceholderSelectByIndex(root, 1, range.secondOperator, `${sourceRef}: 取值范围第二操作符`);
      await fillNthNumberInput(root, 1, range.secondValue, sourceRef);
    }
  }
  const enumSection = await findRuleSectionByLabel(root, "枚举值设置：", sourceRef, { required: false });
  if (enumSection && (await enumSection.locator(".ant-select:visible").filter({ hasText: /支持输入多个枚举值/ }).last().isVisible({ timeout: 1_500 }).catch(() => false))) {
    const enumExpected = parseEnumExpectation(rule, { operator: "in", values: ["1"] });
    await chooseSectionSelect(enumSection, 0, enumExpected.operator, `${sourceRef}: 枚举值操作符`);
    await fillEnumTagValues(enumSection, enumExpected.values, sourceRef);
    const relationSection = await findRuleSectionByLabel(root, "取值范围和枚举值的关系：", sourceRef, { required: false });
    if (relationSection) await clickSectionRadio(relationSection, range.enumRelation ?? "且", `${sourceRef}: 取值范围和枚举值关系`);
  }
}

async function configureStringLengthExpected(root: UiSearchRoot, value: string, sourceRef: string): Promise<void> {
  await expect(root.locator(".ant-select:visible").filter({ hasText: /字符串长度/ }).first(), `${sourceRef}: 字符串长度统计规则应已选中`).toBeVisible({
    timeout: 30_000,
  });
  await chooseNextPlaceholderSelect(root, "固定值", sourceRef);
  await chooseNextPlaceholderSelect(root, ">=", sourceRef);
  await fillNthNumberInput(root, 0, value, sourceRef);
}

async function configureFixedValueStatisticExpected(
  root: UiSearchRoot,
  statistic: string,
  operator: string,
  value: string,
  sourceRef: string,
  method = "固定值",
): Promise<void> {
  await ensureStatisticFunction(root, statistic, sourceRef);
  await ensureMethodSelected(root, method, sourceRef);
  await chooseNextPlaceholderSelect(root, operator, sourceRef);
  await fillNthNumberInput(root, 0, value, sourceRef);
}

async function ensureMethodSelected(root: UiSearchRoot, method: string, sourceRef: string): Promise<void> {
  const selected = root.locator(".ant-select:visible").filter({ hasText: new RegExp(escapeRegExp(method)) }).first();
  if (await selected.isVisible({ timeout: 1_000 }).catch(() => false)) return;
  if (await selectExactLabeledOptionIfVisible(root, "校验方法", method, sourceRef)) return;
  await chooseNextPlaceholderSelect(root, method, sourceRef);
}

async function configureCompareTableRow(
  root: UiSearchRoot,
  tableName: string,
  fieldName: string,
  sourceRef: string,
  options: { fieldCellIndex?: number; skipField?: boolean; skipLogic?: boolean } = {},
): Promise<void> {
  const page = rootPage(root);
  const section = root.locator(".ant-form-item:visible, .ant-row:visible").filter({ hasText: /选择对比表/ }).last();
  await expect(section, `${sourceRef}: 多表唯一性应展示选择对比表区域`).toBeVisible({ timeout: 30_000 });
  const addButton = section.getByRole("button", { name: /新增/ }).or(section.locator("button:visible").filter({ hasText: /新增/ })).first();
  if (await section.getByText(/暂无数据/).isVisible({ timeout: 1_500 }).catch(() => false)) {
    await expect(addButton, `${sourceRef}: 选择对比表区域应展示新增按钮`).toBeVisible({ timeout: 30_000 });
    await addButton.click({ timeout: 30_000 });
    await waitForSpin(page, sourceRef);
  }
  const row = section.locator(".ant-table-tbody tr").last();
  await expect(row, `${sourceRef}: 新增对比表后应出现配置行`).toBeVisible({ timeout: 30_000 });
  await expect(row, `${sourceRef}: 对比表配置行不应为空`).not.toContainText(/暂无数据/, { timeout: 30_000 });
  const tableSelect = row.locator(".ant-select:visible").first();
  await expect(tableSelect, `${sourceRef}: 对比表行应展示对比表下拉`).toBeVisible({ timeout: 30_000 });
  await selectDataTableFromField(page, row, tableName, sourceRef, "对比表");
  await configureCompareTablePartition(row, tablePartitionDate(), sourceRef);
  if (options.skipField) {
    await expect(section, `${sourceRef}: 对比表应回显 ${tableName}`).toContainText(tableName, { timeout: 30_000 });
    return;
  }
  const fieldCell = row.locator("td").nth(options.fieldCellIndex ?? 2);
  await expect(fieldCell, `${sourceRef}: 对比表行应展示对比表字段列`).toBeVisible({ timeout: 30_000 });
  const fieldSelect = fieldCell.locator(".ant-select:visible").first();
  await expect(fieldSelect, `${sourceRef}: 对比表字段列应展示字段下拉`).toBeVisible({ timeout: 30_000 });
  await chooseFromSelectWithRetry(page, fieldSelect, fieldName, sourceRef, 3);
  if (!options.skipLogic) {
    const logicSelect = row.locator("td").nth(3).locator(".ant-select:visible").first();
    if (await logicSelect.isVisible({ timeout: 1_500 }).catch(() => false)) {
      await chooseFromSelect(page, logicSelect, "唯一", sourceRef, { required: false });
    }
  }
  await expect(section, `${sourceRef}: 对比表应回显 ${tableName}`).toContainText(tableName, { timeout: 30_000 });
}

async function configureTableRowCountCompare(root: UiSearchRoot, database: string, tableName: string, sourceRef: string): Promise<void> {
  const page = rootPage(root);
  const section = root.locator(".ant-form-item:visible, .ant-row:visible").filter({ hasText: /选择对比表/ }).last();
  await expect(section, `${sourceRef}: 多表数据行数对比应展示选择对比表区域`).toBeVisible({ timeout: 30_000 });
  const addButton = section.getByRole("button", { name: /新增/ }).or(section.locator("button:visible").filter({ hasText: /新增/ })).first();
  if (await section.getByText(/暂无数据/).isVisible({ timeout: 1_500 }).catch(() => false)) {
    await expect(addButton, `${sourceRef}: 多表数据行数对比应展示新增按钮`).toBeVisible({ timeout: 30_000 });
    await addButton.click({ timeout: 30_000 });
    await waitForSpin(page, sourceRef);
  }
  const row = section.locator(".ant-table-tbody tr").last();
  await expect(row, `${sourceRef}: 多表数据行数对比应展示对比表配置行`).toBeVisible({ timeout: 30_000 });
  await expect(row, `${sourceRef}: 多表数据行数对比配置行不应为空`).not.toContainText(/暂无数据/, { timeout: 30_000 });
  const databaseSelect = row.locator(".ant-select:visible").nth(0);
  await expect(databaseSelect, `${sourceRef}: 对比表所属库下拉应可见`).toBeVisible({ timeout: 30_000 });
  await chooseFromSelectWithRetry(page, databaseSelect, database, sourceRef, 3);
  await selectDataTableFromField(page, row, tableName, sourceRef, "多表数据行数对比对比表", 1);
  await configureCompareTablePartition(row, tablePartitionDate(), sourceRef);
  await expect(section, `${sourceRef}: 多表数据行数对比对比表应回显 ${tableName}`).toContainText(tableName, { timeout: 30_000 });
}

async function configureConsistencyCompareTable(root: UiSearchRoot, tableName: string, sourceRef: string): Promise<void> {
  const page = rootPage(root);
  await page.keyboard.press("Escape").catch(() => {});
  const table = root.locator("table:visible").filter({ hasText: /选择对比表主键/ }).first();
  await expect(table, `${sourceRef}: 一致性校验应展示选择对比表主键表格`).toBeVisible({ timeout: 30_000 });
  if (await table.getByText(/暂无数据/).isVisible({ timeout: 1_500 }).catch(() => false)) {
    const addButton = root.getByRole("button", { name: /新增/ }).or(root.locator("button:visible").filter({ hasText: /新增/ })).last();
    await expect(addButton, `${sourceRef}: 一致性对比表应展示新增按钮`).toBeVisible({ timeout: 30_000 });
    await addButton.click({ timeout: 30_000 });
    await waitForSpin(page, sourceRef);
  }
  const row = table.locator("tbody tr").last();
  await expect(row, `${sourceRef}: 一致性校验应展示对比表配置行`).toBeVisible({ timeout: 30_000 });
  await expect(row, `${sourceRef}: 一致性对比表配置行不应为空`).not.toContainText(/暂无数据/, { timeout: 30_000 });
  const rowText = await row.innerText({ timeout: 3_000 }).catch(() => "");
  if (!rowText.includes(tableName)) {
    await selectDataTableFromField(page, row, tableName, sourceRef, "一致性对比表");
  }
  await configureCompareTablePartition(row, tablePartitionDate(), sourceRef);
  const keyCell = row.locator("td").nth(2);
  await expect(keyCell, `${sourceRef}: 一致性对比表行应展示对比表主键列`).toBeVisible({ timeout: 30_000 });
  const keySelect = keyCell.locator(".ant-select:visible").first();
  await expect(keySelect, `${sourceRef}: 一致性对比表主键列应展示下拉`).toBeVisible({ timeout: 30_000 });
  await chooseFromSelectWithRetry(page, keySelect, "id", sourceRef, 3);
}

async function configureCompareTablePartition(row: Locator, partitionValue: string, sourceRef: string): Promise<void> {
  const page = row.page();
  const partitionCell = row.locator("td").nth(1);
  if (!(await partitionCell.isVisible({ timeout: 2_000 }).catch(() => false))) return;
  const partitionSelect = partitionCell.locator(".ant-select:visible").filter({ hasText: /请选择分区/ }).last();
  if (!(await partitionSelect.isVisible({ timeout: 2_000 }).catch(() => false))) return;
  await page.keyboard.press("Escape").catch(() => {});
  await partitionSelect.click({ force: true, timeout: 30_000 });
  const dropdown = page.locator(".ant-select-dropdown:visible").last();
  await expect(dropdown, `${sourceRef}: 一致性对比表分区下拉应展开`).toBeVisible({ timeout: 30_000 });
  const option = dropdown.getByText(partitionValue, { exact: false }).last();
  await expect(option, `${sourceRef}: 一致性对比表分区下拉应包含 ${partitionValue}`).toBeVisible({ timeout: 30_000 });
  await option.click({ timeout: 30_000 });
  await waitForSpin(page, sourceRef);
  await expect(partitionCell, `${sourceRef}: 一致性对比表分区应回显 ${partitionValue}`).toContainText(partitionValue, {
    timeout: 30_000,
  });
}

async function configureConsistencyFieldMappings(root: UiSearchRoot, fields: string[], sourceRef: string): Promise<void> {
  const page = rootPage(root);
  const table = root.locator("table:visible").filter({ hasText: /校验表比对字段/ }).last();
  await expect(table, `${sourceRef}: 一致性校验应展示比对字段设置表格`).toBeVisible({ timeout: 30_000 });
  for (const field of fields) {
    const row = table.locator("tbody tr").filter({ hasText: new RegExp(`^\\s*${escapeRegExp(field)}\\b`) }).first();
    await expect(row, `${sourceRef}: 比对字段设置应展示 ${field} 行`).toBeVisible({ timeout: 30_000 });
    const select = row.locator(".ant-select:visible").first();
    await expect(select, `${sourceRef}: ${field} 行应展示对比表字段下拉`).toBeVisible({ timeout: 30_000 });
    const selected = await chooseFromSelect(page, select, field, sourceRef, { required: false });
    if (!selected) {
      const fallback = await selectFieldOption(root, /对比表1|对比表字段|比较字段/, field, sourceRef, { required: false });
      expect(fallback, `${sourceRef}: 应选择比对字段映射 ${field}`).toBe(true);
    }
  }
}

async function configureSingleFieldTimeDiff(root: UiSearchRoot, sourceRef: string): Promise<void> {
  const timeField = root
    .locator(".ant-form-item:visible, .ant-row:visible")
    .filter({ hasText: /^\s*\*?\s*时间差/ })
    .last();
  await expect(timeField, `${sourceRef}: 周期性校验应展示时间差配置`).toBeVisible({ timeout: 30_000 });
  await chooseTimeDiffControls(timeField, [">=", "大于等于", "不小于", "大于或等于"], "1", ["秒"], sourceRef);
}

async function configureMultiFieldTimeDiff(root: UiSearchRoot, fields: string[], sourceRef: string): Promise<void> {
  const page = rootPage(root);
  const table = root.locator("table:visible").filter({ hasText: /选择对比字段组/ }).last();
  await expect(table, `${sourceRef}: 及时性校验应展示对比字段组表`).toBeVisible({ timeout: 30_000 });
  let row = table.locator(".ant-table-tbody tr").filter({ hasNotText: /暂无数据/ }).last();
  if (!(await row.isVisible({ timeout: 1_500 }).catch(() => false))) {
    const addButton = root.getByRole("button", { name: /新增/ }).last();
    await expect(addButton, `${sourceRef}: 及时性校验应展示新增对比字段组按钮`).toBeVisible({ timeout: 30_000 });
    await addButton.click({ timeout: 30_000 });
    await waitForSpin(page, sourceRef);
    row = table.locator(".ant-table-tbody tr").filter({ hasNotText: /暂无数据/ }).last();
  }
  await expect(row, `${sourceRef}: 及时性校验应新增对比字段组行`).toBeVisible({ timeout: 30_000 });

  const fieldCell = row.locator("td").nth(0);
  const fieldSelect = fieldCell.locator(".ant-select:visible").first();
  await expect(fieldSelect, `${sourceRef}: 对比字段组应展示字段下拉`).toBeVisible({ timeout: 30_000 });
  await chooseMultipleFromSelect(page, fieldSelect, [...fields].reverse(), sourceRef, fieldCell);
  for (const field of fields) {
    await expect(fieldCell, `${sourceRef}: 对比字段组应包含 ${field}`).toContainText(field, { timeout: 30_000 });
  }

  const timeCell = row.locator("td").nth(1);
  await chooseTimeDiffControls(timeCell, ["<", "小于"], "1", ["分钟", "分"], sourceRef);

  const relationCell = row.locator("td").nth(2);
  const relationSelect = relationCell.locator(".ant-select:visible").first();
  await expect(relationSelect, `${sourceRef}: 及时性校验应展示大小关系下拉`).toBeVisible({ timeout: 30_000 });
  const relationTextBefore = ((await relationCell.innerText({ timeout: 3_000 }).catch(() => "")) ?? "").replace(/\s+/g, "");
  const leftField = relationTextBefore.includes(fields[0]) ? fields[0] : fields[1];
  const rightField = leftField === fields[0] ? fields[1] : fields[0];
  const operatorOptions = leftField === fields[0] ? ["<", "小于"] : [">", "大于"];
  await chooseAnyFromSelect(page, relationSelect, operatorOptions, sourceRef);
  await selectRelationRightField(page, relationCell, rightField, sourceRef);
  await expect(relationCell, `${sourceRef}: 及时性校验大小关系不应缺少右侧字段`).not.toContainText("--", { timeout: 30_000 });
}

async function configureCalculationLogic(root: UiSearchRoot, expression: string, sourceRef: string): Promise<void> {
  const page = rootPage(root);
  const field = root
    .locator(".ant-form-item:visible, .ant-row:visible")
    .filter({ hasText: /计算逻辑配置|计算逻辑/ })
    .last();
  await expect(field, `${sourceRef}: 字段值计算对比应展示计算逻辑配置`).toBeVisible({ timeout: 30_000 });

  const directInput = field.locator("textarea:visible, input:visible").first();
  if (await directInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
    const readonly = await directInput
      .evaluate((element) => {
        const input = element as HTMLInputElement | HTMLTextAreaElement;
        return input.disabled || input.readOnly || input.hasAttribute("disabled") || input.hasAttribute("readonly");
      })
      .catch(() => true);
    if (!readonly) {
      await directInput.fill(expression, { timeout: 30_000 });
      await directInput.press("Tab").catch(() => {});
      if (await field.locator("input, textarea").filter({ hasText: expression }).isVisible({ timeout: 1_000 }).catch(() => false)) return;
    }
  }

  const button = field.locator("button:visible").first();
  await expect(button, `${sourceRef}: 计算逻辑配置应展示配置按钮`).toBeVisible({ timeout: 30_000 });
  await button.click({ timeout: 30_000 });
  await page.waitForTimeout(1_000);

  const panel = page.locator(".ant-modal:visible, .ant-drawer:visible, .ant-popover:visible").last();
  await expect(panel, `${sourceRef}: 应打开计算逻辑配置弹窗或浮层`).toBeVisible({ timeout: 30_000 });
  const editor = panel
    .locator(
      "textarea.calc-logic-modal__editor:visible, textarea[placeholder*='计算']:visible, [contenteditable='true']:visible",
    )
    .first();
  await expect(editor, `${sourceRef}: 计算逻辑配置应展示可编辑区域`).toBeVisible({ timeout: 30_000 });
  const tagName = await editor.evaluate((element) => element.tagName.toLowerCase()).catch(() => "");
  if (tagName === "input" || tagName === "textarea") {
    await editor.fill(expression, { timeout: 30_000 });
    await expect(editor, `${sourceRef}: 计算逻辑配置编辑区应回显 ${expression}`).toHaveValue(expression, {
      timeout: 30_000,
    });
  } else {
    await editor.click({ timeout: 30_000 });
    await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A").catch(() => {});
    await page.keyboard.type(expression);
    await expect(editor, `${sourceRef}: 计算逻辑配置编辑区应回显 ${expression}`).toContainText(expression, {
      timeout: 30_000,
    });
  }
  const confirm = panel.getByRole("button", { name: /确\s*定|保\s*存|完\s*成/ }).last();
  await expect(confirm, `${sourceRef}: 计算逻辑配置应展示确认按钮`).toBeVisible({ timeout: 30_000 });
  await confirm.click({ timeout: 30_000 });
  await waitForSpin(page, sourceRef);
  await expect(panel, `${sourceRef}: 计算逻辑配置弹窗应关闭`).toBeHidden({ timeout: 30_000 });
  await expect(directInput, `${sourceRef}: 计算逻辑配置应回写到表单`).toHaveValue(expression, { timeout: 30_000 });
  await expect(field, `${sourceRef}: 计算逻辑配置不应继续提示必填`).not.toContainText("请配置计算逻辑配置", { timeout: 30_000 });
}

async function configureCalculationCompare(root: UiSearchRoot, expression: string, sourceRef: string): Promise<void> {
  const page = rootPage(root);
  const row = root.locator(".calc-compare-display:visible").filter({ hasText: expression }).last();
  await expect(row, `${sourceRef}: 字段值计算对比应展示包含计算表达式的对比行`).toBeVisible({ timeout: 30_000 });
  await expect(row, `${sourceRef}: 字段值计算对比行应展示 age 字段`).toContainText("age", { timeout: 30_000 });
  const select = row.locator(".ant-select:visible").first();
  await expect(select, `${sourceRef}: age 对比行应展示大小关系下拉`).toBeVisible({ timeout: 30_000 });
  await chooseAnyFromSelect(page, select, ["<", "小于"], sourceRef);
}

async function selectRelationRightField(page: Page, relationCell: Locator, field: string, sourceRef: string): Promise<void> {
  if (!(await relationCell.getByText("--", { exact: true }).last().isVisible({ timeout: 1_000 }).catch(() => false))) return;
  await relationCell.getByText("--", { exact: true }).last().click({ force: true, timeout: 10_000 }).catch(() => {});
  await chooseFromVisibleDropdown(page, field, sourceRef);
}

async function chooseTimeDiffControls(
  root: Locator,
  operatorOptions: string[],
  value: string,
  unitOptions: string[],
  sourceRef: string,
): Promise<void> {
  const page = root.page();
  const selects = root.locator(".ant-select:visible");
  await expect(selects.first(), `${sourceRef}: 时间差应展示条件下拉`).toBeVisible({ timeout: 30_000 });
  await chooseAnyFromSelect(page, selects.first(), operatorOptions, sourceRef);
  const input = root.locator('input[role="spinbutton"]:visible, .ant-input-number-input:visible').first();
  await expect(input, `${sourceRef}: 时间差应展示数值输入框`).toBeVisible({ timeout: 30_000 });
  await input.fill(value, { timeout: 30_000 });
  await expect(input, `${sourceRef}: 时间差数值应回显 ${value}`).toHaveValue(value, { timeout: 30_000 });
  await expect(selects.last(), `${sourceRef}: 时间差应展示单位下拉`).toBeVisible({ timeout: 30_000 });
  await chooseAnyFromSelect(page, selects.last(), unitOptions, sourceRef);
}

async function selectExactLabeledOption(root: UiSearchRoot, labelText: string, option: string, sourceRef: string): Promise<void> {
  const selected = await selectExactLabeledOptionIfVisible(root, labelText, option, sourceRef);
  expect(selected, `${sourceRef}: 应选择精确表单项 ${labelText}=${option}`).toBe(true);
}

async function selectTextLabeledOption(root: UiSearchRoot, labelText: string, option: string, sourceRef: string): Promise<void> {
  if (await selectExactLabeledOptionIfVisible(root, labelText, option, sourceRef)) return;
  const selected = await selectTextLabeledOptionIfVisible(root, labelText, option, sourceRef);
  expect(selected, `${sourceRef}: 应选择文本表单项 ${labelText}=${option}`).toBe(true);
}

async function selectExactLabeledOptionIfVisible(root: UiSearchRoot, labelText: string, option: string, sourceRef: string): Promise<boolean> {
  const page = rootPage(root);
  const field = root
    .locator(".ant-form-item:visible")
    .filter({ has: root.locator("label:visible").filter({ hasText: new RegExp(`^\\s*\\*?\\s*${escapeRegExp(labelText)}\\s*$`) }) })
    .last();
  if (!(await field.isVisible({ timeout: 1_500 }).catch(() => false))) return false;
  const select = field.locator(".ant-select:visible").first();
  if (!(await select.isVisible({ timeout: 1_500 }).catch(() => false))) return false;
  return await chooseFromSelect(page, select, option, sourceRef, { required: false });
}

async function selectTextLabeledOptionIfVisible(root: UiSearchRoot, labelText: string, option: string, sourceRef: string): Promise<boolean> {
  const page = rootPage(root);
  const field = root
    .locator(".ant-form-item:visible, .ant-row:visible")
    .filter({ hasText: new RegExp(`^\\s*\\*?\\s*${escapeRegExp(labelText)}(?!逻辑)`) })
    .last();
  if (await field.isVisible({ timeout: 1_500 }).catch(() => false)) {
    const selectedText = (
      (await field
        .locator(".ant-select-selection-item:visible, .ant-select-selection-item-content:visible")
        .first()
        .innerText({ timeout: 1_000 })
        .catch(() => "")) ?? ""
    ).replace(/\s+/g, "");
    if (selectedText.includes(option.replace(/\s+/g, ""))) return true;
    const select = field.locator(".ant-select:visible").first();
    if (await select.isVisible({ timeout: 1_500 }).catch(() => false)) {
      return await chooseFromSelect(page, select, option, sourceRef, { required: false });
    }
  }

  const label = root.getByText(labelText, { exact: true }).last();
  if (!(await label.isVisible({ timeout: 1_500 }).catch(() => false))) return false;
  const labelContainer = label.locator("xpath=ancestor::*[.//*[contains(concat(' ', normalize-space(@class), ' '), ' ant-select ')]][1]");
  if (!(await labelContainer.isVisible({ timeout: 1_500 }).catch(() => false))) return false;
  const select = labelContainer.locator(".ant-select:visible").first();
  if (!(await select.isVisible({ timeout: 1_500 }).catch(() => false))) return false;
  return await chooseFromSelect(page, select, option, sourceRef, { required: false });
}

async function fillEnumTagValues(root: UiSearchRoot, values: string[], sourceRef: string): Promise<void> {
  const valueSelect = root.locator(".ant-select:visible").filter({ hasText: /支持输入多个枚举值/ }).last();
  await expect(valueSelect, `${sourceRef}: 枚举值输入框应可见`).toBeVisible({ timeout: 30_000 });
  const page = rootPage(root);
  const selectorHandle = await valueSelect.locator(".ant-select-selector").elementHandle({ timeout: 30_000 });
  expect(selectorHandle, `${sourceRef}: 枚举值 selector 句柄应存在`).toBeTruthy();
  for (const value of values) {
    await selectorHandle!.click({ timeout: 10_000 });
    await page.keyboard.type(value, { delay: 20 });
    const option = page
      .locator(".ant-select-dropdown:visible .ant-select-item-option:not(.ant-select-item-option-disabled):visible")
      .filter({ hasText: new RegExp(`^\\s*${escapeRegExp(value)}\\s*$`) })
      .first();
    if (await option.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await option.click({ timeout: 10_000 });
    } else {
      await page.keyboard.press("Enter", { delay: 50 });
    }
    await page.waitForTimeout(200);
    await expect(root.locator(".ant-select-selection-item-content:visible").filter({ hasText: value }).first(), `${sourceRef}: 枚举值应回显 ${value}`).toBeVisible({
      timeout: 10_000,
    });
  }
  await page.keyboard.press("Escape").catch(() => {});
  const echoRoot = typeof (root as Locator).page === "function" ? (root as Locator) : (root as Page).locator("body");
  await expect(echoRoot, `${sourceRef}: 枚举值应回显 ${values[0]}`).toContainText(values[0], {
    timeout: 30_000,
  });
}

async function chooseNextPlaceholderSelect(root: UiSearchRoot, option: string, sourceRef: string): Promise<void> {
  const page = rootPage(root);
  await page.keyboard.press("Escape").catch(() => {});
  if (isExpectedOperator(option) && (await chooseLabeledPlaceholderSelect(root, /期望值|枚举值信息/, option, sourceRef))) return;
  const candidates = root.locator(".ant-select:visible").filter({ hasText: /请选择/ });
  await expect(candidates.first(), `${sourceRef}: 应展示待选择操作符`).toBeVisible({ timeout: 30_000 });
  const count = await candidates.count();
  for (const item of operatorAliases(option)) {
    for (let index = 0; index < count; index += 1) {
      const selected = await chooseFromSelect(page, candidates.nth(index), item, sourceRef, { required: false });
      if (selected) return;
    }
  }
  throw new Error(`${sourceRef}: 未找到包含 ${option} 的待选择下拉，共检查 ${count} 个候选`);
}

async function choosePlaceholderSelectByIndex(root: UiSearchRoot, index: number, option: string, sourceRef: string): Promise<void> {
  const page = rootPage(root);
  await page.keyboard.press("Escape").catch(() => {});
  const candidates = root.locator(".ant-select:visible").filter({ hasText: /请选择|请选择操作符/ });
  await expect(candidates.first(), `${sourceRef}: 应至少存在 1 个待选择下拉`).toBeVisible({ timeout: 30_000 });
  const count = await candidates.count();
  const target = candidates.nth(Math.min(index, count - 1));
  await expect(target, `${sourceRef}: 第 ${index + 1} 个待选择下拉应可见`).toBeVisible({ timeout: 30_000 });
  for (const item of operatorAliases(option)) {
    if (await chooseFromSelect(page, target, item, sourceRef, { required: false })) return;
  }
  throw new Error(`${sourceRef}: 第 ${index + 1} 个待选择下拉未能选择 ${option}`);
}

function operatorAliases(option: string): string[] {
  if (option === "=") return ["=", "等于", "=="];
  if (option === "!=") return ["!=", "<>", "不等于"];
  return [option];
}

function isExpectedOperator(option: string): boolean {
  return ["=", "!=", ">", ">=", "<", "<=", "in", "not in"].includes(option);
}

async function chooseLabeledPlaceholderSelect(root: UiSearchRoot, label: RegExp, option: string, sourceRef: string): Promise<boolean> {
  const page = rootPage(root);
  const fields = root.locator(".ant-form-item:visible, .ant-row:visible").filter({ hasText: label });
  const fieldCount = await fields.count();
  for (const item of operatorAliases(option)) {
    for (let fieldIndex = fieldCount - 1; fieldIndex >= 0; fieldIndex -= 1) {
      const selects = fields.nth(fieldIndex).locator(".ant-select:visible").filter({ hasText: /请选择|请选择操作符/ });
      const selectCount = await selects.count();
      for (let selectIndex = selectCount - 1; selectIndex >= 0; selectIndex -= 1) {
        if (await chooseFromSelect(page, selects.nth(selectIndex), item, sourceRef, { required: false })) return true;
      }
    }
  }
  return false;
}

async function fillNthNumberInput(root: UiSearchRoot, index: number, value: string, sourceRef: string): Promise<void> {
  const input = root
    .locator(
      [
        'input[placeholder*="请输入数值"]:not([readonly]):not([disabled]):visible',
        'input[placeholder*="请填写数值"]:not([readonly]):not([disabled]):visible',
      ].join(", "),
    )
    .nth(index);
  await expect(input, `${sourceRef}: 第 ${index + 1} 个数值输入框应可见`).toBeVisible({ timeout: 30_000 });
  await fillInputLikeUser(input, value, `${sourceRef}: 第 ${index + 1} 个数值输入框`);
}

async function findRuleSectionByLabel(
  root: UiSearchRoot,
  labelText: string,
  sourceRef: string,
  options: { required?: boolean } = {},
): Promise<Locator | undefined> {
  const label = root.getByText(labelText, { exact: true }).last();
  const visible = await label.isVisible({ timeout: options.required === false ? 1_500 : 30_000 }).catch(() => false);
  if (!visible) {
    if (options.required === false) return undefined;
    await expect(label, `${sourceRef}: 应展示 ${labelText}`).toBeVisible({ timeout: 30_000 });
  }
  const section = label.locator(
    "xpath=ancestor::*[.//input or .//*[contains(concat(' ', normalize-space(@class), ' '), ' ant-select ') or contains(concat(' ', normalize-space(@class), ' '), ' ant-radio ') or contains(concat(' ', normalize-space(@class), ' '), ' ant-radio-wrapper ')]][1]",
  );
  await expect(section, `${sourceRef}: ${labelText} 区域应可见`).toBeVisible({ timeout: 30_000 });
  return section;
}

async function chooseSectionSelect(section: Locator, index: number, option: string, sourceRef: string): Promise<void> {
  const page = section.page();
  const select = section.locator(".ant-select:visible").nth(index);
  await expect(select, `${sourceRef}: 第 ${index + 1} 个下拉应可见`).toBeVisible({ timeout: 30_000 });
  for (const item of operatorAliases(option)) {
    if (await chooseFromSelect(page, select, item, sourceRef, { required: false })) return;
  }
  const debug = await section
    .evaluate((element) => ({
      text: (element.textContent ?? "").replace(/\s+/g, " ").trim(),
      selects: Array.from(element.querySelectorAll(".ant-select")).map((selectElement, selectIndex) => ({
        index: selectIndex,
        text: (selectElement.textContent ?? "").replace(/\s+/g, " ").trim(),
      })),
    }))
    .catch((error) => ({ error: error instanceof Error ? error.message : String(error) }));
  await test.info().attach(`${sanitizeAttachmentName(sourceRef)}-section-select-debug.json`, {
    body: JSON.stringify(debug, null, 2),
    contentType: "application/json",
  });
  throw new Error(`${sourceRef}: 区域第 ${index + 1} 个下拉未能选择 ${option}`);
}

async function fillSectionNumberInput(section: Locator, index: number, value: string, sourceRef: string): Promise<void> {
  const input = section
    .locator(
      [
        'input[placeholder*="请输入数值"]:not([readonly]):not([disabled]):visible',
        'input[placeholder*="请填写数值"]:not([readonly]):not([disabled]):visible',
      ].join(", "),
    )
    .nth(index);
  await expect(input, `${sourceRef}: 第 ${index + 1} 个数值输入框应可见`).toBeVisible({ timeout: 30_000 });
  await fillInputLikeUser(input, value, sourceRef);
}

async function clickSectionRadio(section: Locator, labelText: string, sourceRef: string): Promise<void> {
  const radio = section.locator(".ant-radio-wrapper:visible, label:visible").filter({ hasText: new RegExp(`^\\s*${escapeRegExp(labelText)}\\s*$`) }).first();
  await expect(radio, `${sourceRef}: 应展示单选 ${labelText}`).toBeVisible({ timeout: 30_000 });
  await radio.click({ timeout: 30_000 });
}

async function fillInputLikeUser(input: Locator, value: string, label: string): Promise<void> {
  const page = input.page();
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await input.scrollIntoViewIfNeeded({ timeout: 5_000 }).catch(() => {});
    await input.click({ timeout: 30_000, force: true });
    await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A").catch(() => {});
    await page.keyboard.press("Backspace").catch(() => {});
    await page.keyboard.type(value, { delay: 20 });
    await page.keyboard.press("Tab").catch(() => {});
    await page.waitForTimeout(300);
    if ((await input.inputValue({ timeout: 1_000 }).catch(() => "")) === value) return;

    await input.fill(value, { timeout: 30_000 }).catch(() => {});
    await input
      .evaluate((element, nextValue) => {
        const inputElement = element as HTMLInputElement | HTMLTextAreaElement;
        inputElement.value = nextValue;
        inputElement.dispatchEvent(new Event("input", { bubbles: true }));
        inputElement.dispatchEvent(new Event("change", { bubbles: true }));
        inputElement.dispatchEvent(new Event("blur", { bubbles: true }));
      }, value)
      .catch(() => {});
    await page.waitForTimeout(300);
    if ((await input.inputValue({ timeout: 1_000 }).catch(() => "")) === value) return;
  }

  const debug = await input
    .evaluate((element) => {
      const inputElement = element as HTMLInputElement | HTMLTextAreaElement;
      return {
        id: inputElement.id,
        name: inputElement.getAttribute("name"),
        placeholder: inputElement.getAttribute("placeholder"),
        value: inputElement.value,
        disabled: inputElement.disabled,
        readOnly: inputElement.readOnly,
        className: inputElement.className,
      };
    })
    .catch((error) => ({ error: String(error) }));
  await test.info().attach(`${sanitizeAttachmentName(label)}-input-debug.json`, {
    body: JSON.stringify(debug, null, 2),
    contentType: "application/json",
  });
  await expect(input, `${label}应回显 ${value}`).toHaveValue(value, { timeout: 1_000 });
}

async function clickInlineRadio(root: UiSearchRoot, labelText: string, sourceRef: string): Promise<void> {
  await clickNthInlineRadio(root, labelText, 0, sourceRef);
}

async function clickNthInlineRadio(root: UiSearchRoot, labelText: string, index: number, sourceRef: string): Promise<void> {
  const radio = root.locator(".ant-radio-wrapper:visible, label:visible").filter({ hasText: new RegExp(`^\\s*${escapeRegExp(labelText)}\\s*$`) }).nth(index);
  await expect(radio, `${sourceRef}: 应展示单选 ${labelText}`).toBeVisible({ timeout: 30_000 });
  await radio.click({ timeout: 30_000 });
}

function isRuleSpecificExpectedHandled(rule: V6411RuleSpec): boolean {
  return [
    "数值-取值范围",
    "数值-枚举个数",
    "枚举值",
    "取值范围&枚举范围",
    "字符串长度",
    "重复数",
    "多表唯一性判断",
    "异常值检测",
    "自定义规则测试",
    "多表数据一致性比对",
    "周期性校验（单字段时间差校验）",
    "及时性校验（多字段时间差校验）",
    "数据变化趋势",
    "字段值计算对比",
  ].includes(rule.functionName);
}

function isRuleSpecificStatisticHandled(rule: V6411RuleSpec): boolean {
  return [
    "重复数",
    "多表唯一性判断",
    "多表数据行数对比",
    "数据精度",
    "异常值检测",
    "多表数据一致性比对",
    "数据变化趋势",
    "字段值计算对比",
  ].includes(rule.functionName);
}

function isRuleSpecificMethodHandled(rule: V6411RuleSpec): boolean {
  return ["数值-枚举个数", "字符串长度", "重复数", "异常值检测", "自定义规则测试", "数据变化趋势", "字段值计算对比"].includes(
    rule.functionName,
  );
}

type ParsedRangeExpectation = {
  firstOperator: string;
  firstValue: string;
  relation: "且" | "或";
  secondOperator?: string;
  secondValue?: string;
  enumRelation?: "且" | "或";
};

type ParsedSimpleNumericExpectation = {
  operator: string;
  value: string;
};

type ParsedEnumExpectation = {
  operator: "in" | "not in";
  values: string[];
};

function parseRangeExpectation(rule: V6411RuleSpec, fallback: ParsedRangeExpectation): ParsedRangeExpectation {
  const text = expectationSourceText(rule)
    .replace(/期望值/g, "")
    .replace(/取值范围/g, "")
    .replace(/选择/g, "")
    .replace(/固定值/g, "");
  const match = text.match(
    /(>=|<=|!=|=|>|<)\s*(-?\d+(?:\.\d+)?)(?:\s*(且|或|and|or)\s*(>=|<=|!=|=|>|<)\s*(-?\d+(?:\.\d+)?))?/i,
  );
  if (!match?.[1] || !match[2]) return fallback;
  return {
    firstOperator: match[1],
    firstValue: match[2],
    relation: normalizeUiRelation(match[3]) ?? fallback.relation,
    secondOperator: match[4],
    secondValue: match[5],
    enumRelation: parseRangeEnumRelation(rule) ?? fallback.enumRelation,
  };
}

function parseSimpleNumericExpectation(
  rule: V6411RuleSpec,
  fallback: ParsedSimpleNumericExpectation,
): ParsedSimpleNumericExpectation {
  const match = expectationSourceText(rule).match(/(>=|<=|!=|=|>|<)\s*(-?\d+(?:\.\d+)?)/);
  if (!match?.[1] || !match[2]) return fallback;
  return { operator: match[1], value: match[2] };
}

function parseEnumExpectation(rule: V6411RuleSpec, fallback: ParsedEnumExpectation): ParsedEnumExpectation {
  const text = expectationSourceText(rule);
  const match = text.match(/\b(not\s*in|in)\s*([0-9A-Za-z_,，、\s.-]+)/i);
  if (!match?.[1] || !match[2]) return fallback;
  const values = match[2]
    .split(/[，,、\s]+/)
    .map((item) => item.trim())
    .filter((item) => /^-?\d+(?:\.\d+)?$/.test(item));
  return {
    operator: match[1].replace(/\s+/g, " ").toLowerCase().trim() === "not in" ? "not in" : "in",
    values: values.length ? values : fallback.values,
  };
}

function parseRangeEnumRelation(rule: V6411RuleSpec): "且" | "或" | undefined {
  const match = expectationSourceText(rule).match(/(?:取值范围和枚举值关系|关系)\D*(且|或|and|or)/i);
  return normalizeUiRelation(match?.[1]);
}

function normalizeUiRelation(value: string | undefined): "且" | "或" | undefined {
  if (!value) return undefined;
  if (/^(且|and)$/i.test(value.trim())) return "且";
  if (/^(或|or)$/i.test(value.trim())) return "或";
  return undefined;
}

function expectationSourceText(rule: V6411RuleSpec): string {
  return `${rule.expected ?? ""} ${rule.notes ?? ""}`.replace(/\s+/g, " ").trim();
}

function expectedOperator(expected: string | undefined): string | undefined {
  return expected?.match(/!=|>=|<=|=|>|</)?.[0];
}

function expectedNumericValue(expected: string | undefined): string | undefined {
  return expected?.match(/-?\d+(?:\.\d+)?/)?.[0];
}

async function selectStatisticFunction(root: UiSearchRoot, functionName: string, sourceRef: string): Promise<void> {
  if (await ensureStatisticFunction(root, functionName, sourceRef, { required: false })) return;
  const candidates = functionName.startsWith("数值-") ? [functionName, functionName.replace(/^数值-/, "")] : [functionName];
  for (const candidate of candidates) {
    if (await selectFieldOption(root, /统计函数|统计规则|规则类型/, candidate, sourceRef, { required: false })) return;
  }
  await selectFieldOption(root, /统计函数|统计规则|规则类型/, functionName, sourceRef);
}

async function ensureStatisticFunction(
  root: UiSearchRoot,
  functionName: string,
  sourceRef: string,
  options: { required?: boolean } = {},
): Promise<boolean> {
  const selected = root.locator(".ant-select:visible").filter({ hasText: new RegExp(escapeRegExp(functionName)) }).first();
  if (await selected.isVisible({ timeout: 1_000 }).catch(() => false)) return true;
  const select = root.locator(".ant-select:visible").filter({ hasText: /请选择统计函数|请选择统计规则|请选择规则类型/ }).first();
  if (!(await select.isVisible({ timeout: options.required === false ? 1_500 : 30_000 }).catch(() => false))) {
    if (options.required === false) return false;
    await expect(select, `${sourceRef}: 应展示统计函数下拉`).toBeVisible({ timeout: 30_000 });
  }
  return await chooseFromSelect(rootPage(root), select, functionName, sourceRef, options);
}

async function selectRuleField(root: UiSearchRoot, field: string, sourceRef: string): Promise<void> {
  const page = rootPage(root);
  const roleCombobox = root.getByRole("combobox", { name: /^\s*\*?\s*字段\s*$/ }).first();
  if (await roleCombobox.isVisible({ timeout: 2_000 }).catch(() => false)) {
    if (await chooseFromSelect(page, roleCombobox, field, sourceRef, { required: false })) return;
  }
  const exactFieldItem = root.locator(".ant-form-item:visible").filter({ hasText: /^\s*\*?\s*(字段|选择字段|校验字段|选择校验字段)(\s|$)/ }).last();
  if (await exactFieldItem.isVisible({ timeout: 2_000 }).catch(() => false)) {
    const exactSelect = exactFieldItem.locator(".ant-select:visible").first();
    await expect(exactSelect, `${sourceRef}: 字段表单项应展示下拉`).toBeVisible({ timeout: 30_000 });
    if (await chooseFromSelect(page, exactSelect, field, sourceRef, { required: false })) return;
  }
  if (await selectFieldOption(root, /选择校验字段|校验字段|选择字段/, field, sourceRef, { required: false })) return;
  const select = root.locator(".ant-select:visible").filter({ hasText: /请选择字段/ }).last();
  await expect(select, `${sourceRef}: 应展示字段下拉`).toBeVisible({ timeout: 30_000 });
  await chooseFromSelect(page, select, field, sourceRef);
}

async function configureRuleFilter(root: UiSearchRoot, filter: string, sourceRef: string): Promise<void> {
  const wrapper = root.locator(".ant-checkbox-wrapper:visible, label:visible").filter({ hasText: /过滤条件/ }).first();
  if (await wrapper.isVisible({ timeout: 1_000 }).catch(() => false)) {
    const checkbox = wrapper.locator("input[type='checkbox']").first();
    if (!(await checkbox.isChecked({ timeout: 1_000 }).catch(() => false))) await wrapper.click({ timeout: 30_000 });
  }
  await selectFieldOption(root, /过滤条件/, "手动配置", sourceRef, { required: false });
  await fillFieldInput(root, /过滤条件/, filter, sourceRef, { required: false });
}

async function fillExpectedValue(root: UiSearchRoot, expected: string, sourceRef: string): Promise<void> {
  const simple = expected.match(/^(>=|<=|!=|=|>|<)(.+)$/);
  if (simple) {
    await selectFieldOption(root, /操作符|比较符|期望值|判断条件/, simple[1], sourceRef, { required: false });
    if (await fillExpectedValueInput(root, simple[2], sourceRef)) return;
    if (await fillFieldInput(root, /期望值/, simple[2], sourceRef, { required: false })) return;
  }
  if (await fillExpectedValueInput(root, expected, sourceRef)) return;
  await fillFieldInput(root, /期望值/, expected, sourceRef, { required: false });
}

async function fillExpectedValueInput(root: UiSearchRoot, value: string, sourceRef: string): Promise<boolean> {
  const input = root
    .locator(
      [
        'input[placeholder*="请填写数值"]:not([readonly]):not([disabled]):visible',
        'input[placeholder*="请输入数值"]:not([readonly]):not([disabled]):visible',
        'input[placeholder*="期望值"]:not([readonly]):not([disabled]):visible',
        ".ant-input-number-input:not([readonly]):not([disabled]):visible",
      ].join(", "),
    )
    .last();
  if (!(await input.isVisible({ timeout: 2_000 }).catch(() => false))) return false;
  await input.fill(value, { timeout: 30_000 });
  await expect(input, `${sourceRef}: 期望值数值输入框应回显 ${value}`).toHaveValue(value, { timeout: 30_000 });
  return true;
}

async function fillRuleDescription(root: UiSearchRoot, value: string, sourceRef: string): Promise<void> {
  const input = root.locator('textarea[placeholder*="规则描述"]:visible, input[placeholder*="规则描述"]:visible').last();
  await expect(input, `${sourceRef}: 应展示规则描述输入框`).toBeVisible({ timeout: 30_000 });
  await input.fill(value, { timeout: 30_000 });
  await expect(input, `${sourceRef}: 规则描述应填入`).toHaveValue(value, { timeout: 30_000 });
}

async function clickRuleSetSave(page: Page, sourceRef: string, build?: UiCaseBuild): Promise<void> {
  let lastValidationText = "";
  let lastBodyText = "";
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const button = page.locator("button:visible").filter({ hasText: /^保\s*存$/ }).last();
    await expect(button, `${sourceRef}: 应展示规则集保存按钮`).toBeVisible({ timeout: 30_000 });
    await button.click({ force: true, timeout: 30_000 });
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    await confirmRuleSetSavePrompt(page, sourceRef);
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      const toastText = (
        (await page
          .locator(".ant-message-notice:visible, .ant-notification-notice:visible")
          .allInnerTexts()
          .catch(() => [])) ?? []
      )
        .join(" ")
        .replace(/\s+/g, " ");
      if (!/\/dq\/ruleSet\/add/.test(page.url()) || /成功/.test(toastText)) {
        await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
        return;
      }
      await page.waitForTimeout(1_000);
    }
    if (build && (await ruleSetRecordExistsInProbePage(page, build, sourceRef))) {
      await test.info().attach(`${sourceRef}-rule-set-save-detected-existing-record.txt`, {
        body: `规则集保存后仍停留新增页，但规则集列表已存在 ${build.tableName} / ${build.ruleName}，停止重复保存并交给后续列表断言校验规则数。`,
        contentType: "text/plain",
      });
      return;
    }
    lastValidationText = await readRuleSetValidationText(page);
    lastBodyText = ((await page.locator("body").innerText({ timeout: 5_000 }).catch(() => "")) ?? "").replace(/\s+/g, " ");
    if (lastValidationText) break;
  }
  throw new Error(
    `${sourceRef}: 规则集保存 3 次后仍停留新增页，疑似保存失败或存在表单校验错误: validation=${lastValidationText}; body=${lastBodyText.slice(0, 2000)}`,
  );
}

async function confirmRuleSetSavePrompt(page: Page, sourceRef: string): Promise<void> {
  const prompt = page
    .locator(".ant-modal-wrap:visible, .ant-modal-confirm:visible, .ant-modal:visible")
    .filter({ hasText: /保存提示/ })
    .last();
  await prompt.waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
  if (!(await prompt.isVisible().catch(() => false))) return;

  const save = prompt.locator("button:visible").filter({ hasText: /^保\s*存$/ }).last();
  await expect(save, `${sourceRef}: 规则集保存提示应展示确认保存按钮`).toBeVisible({ timeout: 30_000 });
  await save.click({ force: true, timeout: 30_000 });
  await expect(prompt, `${sourceRef}: 规则集保存提示确认后应关闭`).toBeHidden({ timeout: 60_000 });
}

async function readRuleSetValidationText(page: Page): Promise<string> {
  return (
    (await page
      .locator(
        ".ant-form-item-explain-error:visible, .ant-form-item-extra:visible, .ant-message-error:visible, .ant-notification-notice-message:visible, .ant-notification-notice-description:visible",
      )
      .allInnerTexts()
      .catch(() => [])) ?? []
  )
    .join(" ")
    .replace(/\s+/g, " ");
}

async function ruleSetRecordExistsInProbePage(page: Page, build: UiCaseBuild, sourceRef: string): Promise<boolean> {
  const probe = await page.context().newPage();
  try {
    await gotoDataQualityPage(probe, "/dq/ruleSet");
    await searchTable(probe, build.tableName, sourceRef);
    const row = probe.locator(".ant-table-tbody tr").filter({ hasText: build.tableName }).filter({ hasText: build.ruleName }).first();
    const exists = await row.isVisible({ timeout: 5_000 }).catch(() => false);
    if (exists) {
      await test.info().attach(`${sourceRef}-probe-existing-rule-set-row.txt`, {
        body: await row.innerText({ timeout: 5_000 }).catch(() => ""),
        contentType: "text/plain",
      });
    }
    return exists;
  } catch (error) {
    await test.info().attach(`${sourceRef}-probe-existing-rule-set-error.txt`, {
      body: error instanceof Error ? error.stack ?? error.message : String(error),
      contentType: "text/plain",
    });
    return false;
  } finally {
    await probe.close().catch(() => {});
  }
}

async function createRuleTaskViaUi(page: Page, build: UiCaseBuild, sourceRef: string): Promise<void> {
  await gotoDataQualityPage(page, "/dq/rule/add");
  await expect(page.locator("body"), `${sourceRef}: 新建监控规则页面应展示监控对象`).toContainText(/监控对象|规则名称/, {
    timeout: 30_000,
  });
  await fillPageFormField(page, /规则名称/, build.ruleName, sourceRef);
  await selectFormOption(page, /数据源/, datasourceUiLabel(build), sourceRef);
  await selectFormOption(page, /数据库/, build.database, sourceRef);
  await selectDataTableFormOption(page, build.tableName, sourceRef);
  await configurePartition(page, build, tablePartitionDate(), sourceRef);
  await configureSampling(page, build, sourceRef);
  await clickButton(page, /^下\s*一\s*步$/, sourceRef, { waitForSpin: false });
  await expect(page.locator("body"), `${sourceRef}: 任务应进入监控规则页`).toContainText(/引用规则包|规则包|引入/, {
    timeout: 30_000,
  });
  await importRulePackage(page, build, sourceRef);
  await clickButton(page, /^下\s*一\s*步$/, sourceRef, { waitForSpin: false });
  await expect(page.locator("body"), `${sourceRef}: 任务应进入调度属性页`).toContainText(/调度配置|调度属性|调度周期/, {
    timeout: 30_000,
  });
  await selectFieldOption(page, /调度周期/, "手动触发", sourceRef);
  await setPackageCount(page, build.packageCount, sourceRef);
  await selectResourceGroup(page, sourceRef, { required: build.datasourceType !== "Doris3.x" });
  await selectFieldOption(page, /超时时间/, "不限制", sourceRef, { required: false });
  await checkNoReport(page, sourceRef);
  recordCreationProgress(build, "rule-task-save-attempted", sourceRef);
  await clickButton(page, /^(保\s*存|新\s*建)$/, sourceRef, { last: true });
  await waitForTaskSaveResult(page, sourceRef, "新建任务", build);
  recordCreationProgress(build, "rule-task-save-finished", sourceRef);
  await gotoDataQualityPage(page, "/dq/rule");
  await searchTable(page, taskListSearchQuery(), sourceRef);
  const row = await findTaskRowAcrossPages(page, build, sourceRef);
  if (!row) throw new Error(`${sourceRef}: 任务列表应展示新建任务`);
  await expect(row, `${sourceRef}: 执行周期应为手动触发`).toContainText("手动触发", { timeout: 30_000 });
}

async function assertTaskListRecord(page: Page, build: UiCaseBuild, sourceRef: string): Promise<void> {
  await gotoDataQualityPage(page, "/dq/rule");
  await searchTable(page, taskListSearchQuery(), sourceRef);
  const row = await findTaskRowAcrossPages(page, build, sourceRef);
  if (!row) throw new Error(`${sourceRef}: 任务列表应展示已有任务`);
  await expect(row, `${sourceRef}: 已有任务应展示数据源 ${build.datasourceName}`).toContainText(build.datasourceName, {
    timeout: 30_000,
  });
  await expect(row, `${sourceRef}: 已有任务执行周期应为手动触发`).toContainText("手动触发", { timeout: 30_000 });
}

function taskListSearchQuery(): string {
  return process.env.V6411_UI_TASK_SEARCH_QUERY ?? "test_info_1_";
}

async function taskListRecordExists(page: Page, build: UiCaseBuild, sourceRef: string): Promise<boolean> {
  await gotoDataQualityPage(page, "/dq/rule");
  await searchTable(page, taskListSearchQuery(), sourceRef);
  return (await findTaskRowAcrossPages(page, build, sourceRef)) !== null;
}

async function findTaskRowAcrossPages(page: Page, build: UiCaseBuild, sourceRef: string): Promise<Locator | null> {
  const totalText = await page
    .locator(".ant-pagination-total-text:visible")
    .last()
    .innerText({ timeout: 3_000 })
    .catch(() => "");
  const totalMatch = totalText.match(/共\s*(\d+)\s*条/);
  const totalCount = totalMatch ? Number(totalMatch[1]) : null;
  const configuredMaxPages = Number(process.env.V6411_UI_TASK_SCAN_MAX_PAGES ?? 0);
  const maxPages = configuredMaxPages > 0 ? configuredMaxPages : totalCount ? Math.max(1, Math.ceil(totalCount / 20)) : 5;
  for (let pageIndex = 1; pageIndex <= maxPages; pageIndex += 1) {
    const rows = page.locator(".ant-table-tbody tr:visible");
    const rowTexts = await rows.allInnerTexts();
    const matchingIndex = rowTexts.findIndex((rowText) => rowText.includes(build.fullTableName));
    if (matchingIndex >= 0) return rows.nth(matchingIndex);

    const next = page.locator(".ant-pagination-next:visible").last();
    const nextClass = await next.getAttribute("class").catch(() => "");
    if (nextClass?.includes("ant-pagination-disabled")) break;
    if (!(await next.isVisible({ timeout: 2_000 }).catch(() => false))) break;
    await next.click({ timeout: 30_000 });
    await expect(page.locator(".ant-spin-spinning"), `${sourceRef}: 翻页后加载遮罩应消失`).toHaveCount(0, {
      timeout: Number(process.env.V6411_UI_SPIN_TIMEOUT_MS ?? 60_000),
    });
    await page.waitForTimeout(500);
  }
  return null;
}

async function ensureTaskDetectionEnabled(page: Page, build: UiCaseBuild, sourceRef: string): Promise<void> {
  let row = await findTaskRowAcrossPages(page, build, sourceRef);
  if (!row) throw new Error(`${sourceRef}: 开启检测前任务行应存在`);
  const rowText = ((await row.innerText({ timeout: 5_000 }).catch(() => "")) ?? "").replace(/\s+/g, " ");
  if (!/未开启检测/.test(rowText)) return;
  const checkbox = row.locator(".ant-checkbox-wrapper:visible, input[type='checkbox']:visible").first();
  await expect(checkbox, `${sourceRef}: 未开启检测任务应可勾选`).toBeVisible({ timeout: 30_000 });
  await checkbox.click({ force: true, timeout: 30_000 });
  const enableButton = page.locator("button:visible").filter({ hasText: /^开\s*启\s*检\s*测$/ }).last();
  await expect(enableButton, `${sourceRef}: 勾选任务后应展示开启检测按钮`).toBeVisible({ timeout: 30_000 });
  await enableButton.click({ force: true, timeout: 30_000 });
  const confirm = page
    .locator(".ant-modal-wrap:visible, .ant-popover:visible, .ant-modal-confirm:visible, .ant-modal:visible")
    .filter({ hasText: /开启检测|确认|确定/ })
    .last();
  if (await confirm.isVisible({ timeout: 3_000 }).catch(() => false)) {
    const ok = confirm.locator("button:visible").filter({ hasText: /确\s*定|确\s*认|OK|是/ }).last();
    await expect(ok, `${sourceRef}: 开启检测确认框应展示确定按钮`).toBeVisible({ timeout: 30_000 });
    await ok.click({ force: true, timeout: 30_000 });
    await expect(confirm, `${sourceRef}: 开启检测确认框应关闭`).toBeHidden({ timeout: 60_000 });
  }
  await waitForSpin(page, sourceRef);
  await searchTable(page, taskListSearchQuery(), sourceRef);
  row = await findTaskRowAcrossPages(page, build, sourceRef);
  if (!row) throw new Error(`${sourceRef}: 开启检测后任务行应存在`);
  await expect(row, `${sourceRef}: 开启检测后任务应显示已开启检测`).toContainText("已开启检测", { timeout: 60_000 });
}

async function editRuleTaskViaUi(page: Page, build: UiCaseBuild, sourceRef: string): Promise<void> {
  await gotoDataQualityPage(page, "/dq/rule");
  await searchTable(page, taskListSearchQuery(), sourceRef);
  const row = await findTaskRowAcrossPages(page, build, sourceRef);
  if (!row) throw new Error(`${sourceRef}: 编辑前任务列表应展示目标任务`);
  await openTaskEditFromRow(row, build, sourceRef);
  await clickNextUntilTaskSave(page, build, sourceRef);
  await gotoDataQualityPage(page, "/dq/rule");
  await searchTable(page, taskListSearchQuery(), sourceRef);
  const savedRow = await findTaskRowAcrossPages(page, build, sourceRef);
  if (!savedRow) throw new Error(`${sourceRef}: 编辑保存后任务列表应展示目标任务`);
  await expect(savedRow, `${sourceRef}: 编辑保存后执行周期仍应为手动触发`).toContainText("手动触发", {
    timeout: 30_000,
  });
}

async function openTaskEditFromRow(row: Locator, build: UiCaseBuild, sourceRef: string): Promise<void> {
  const edit = row.getByRole("button", { name: /^编\s*辑$/ }).or(row.getByText(/^编辑$/)).first();
  await expect(edit, `${sourceRef}: 任务行应展示编辑入口`).toBeVisible({ timeout: 30_000 });
  await edit.click({ timeout: 30_000 });
  const page = row.page();
  await expect(page.locator("body"), `${sourceRef}: 编辑任务页面应打开`).toContainText(/编辑.*校验规则|监控对象|规则名称/, {
    timeout: 30_000,
  });
  await waitForSpin(page, sourceRef);
  await expectPageFormFieldValue(page, /规则名称/, build.ruleName, sourceRef);
  await expect(page.locator("body"), `${sourceRef}: 编辑页应回显目标数据源`).toContainText(build.datasourceName, {
    timeout: 30_000,
  });
  await expect(page.locator("body"), `${sourceRef}: 编辑页应回显目标表`).toContainText(build.tableName, {
    timeout: 30_000,
  });
}

async function expectPageFormFieldValue(page: Page, label: RegExp, value: string, sourceRef: string): Promise<void> {
  const field = page.locator(".ant-form-item:visible").filter({ hasText: label }).first();
  await expect(field, `${sourceRef}: 应展示表单项 ${label}`).toBeVisible({ timeout: 30_000 });
  const input = field.locator("textarea:visible, input:visible").first();
  await expect(input, `${sourceRef}: 表单项 ${label} 应可见`).toBeVisible({ timeout: 30_000 });
  await expect(input, `${sourceRef}: 表单项 ${label} 应回显 ${value}`).toHaveValue(value, { timeout: 30_000 });
}

async function clickNextUntilTaskSave(page: Page, build: UiCaseBuild, sourceRef: string): Promise<void> {
  const clickTaskNext = async (message: string): Promise<void> => {
    const next = page.getByRole("button", { name: "下一步", exact: true });
    await expect
      .poll(
        async () => {
          if ((await next.count().catch(() => 0)) !== 1) return false;
          return (await next.isVisible().catch(() => false)) && (await next.isEnabled().catch(() => false));
        },
        { timeout: 60_000, message },
      )
      .toBe(true);
    await next.click({ timeout: 30_000 });
    await waitForSpin(page, sourceRef);
  };
  let taskRulesReimported = false;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await waitForSpin(page, sourceRef);
    const save = page.getByRole("button", { name: /^保\s*存$/ }).last();
    if (await save.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await selectFieldOption(page, /调度周期/, "手动触发", sourceRef);
      await setPackageCount(page, build.packageCount, sourceRef);
      await selectResourceGroup(page, sourceRef, { required: build.datasourceType !== "Doris3.x" });
      await checkNoReport(page, sourceRef);
      recordCreationProgress(build, "rule-task-edit-save-attempted", sourceRef);
      await save.click({ timeout: 30_000 });
      await waitForTaskSaveResult(page, sourceRef, "编辑任务");
      recordCreationProgress(build, "rule-task-edit-save-finished", sourceRef);
      await waitForSpin(page, sourceRef);
      return;
    }
    if (!taskRulesReimported) {
      if (!(await hasTaskRuleImportFields(page))) {
        await clickTaskNext(`${sourceRef}: 编辑流程应先展示规则包和规则类型`);
      }
      await reimportAllTaskRules(page, sourceRef);
      taskRulesReimported = true;
      continue;
    }
    await clickTaskNext(`${sourceRef}: 编辑流程应展示下一步入口`);
  }
  throw new Error(`${sourceRef}: 编辑任务 4 次下一步后仍未看到保存按钮`);
}

async function configurePartition(page: Page, build: UiCaseBuild, date: string, sourceRef: string): Promise<void> {
  if (!build.partitionEnabled) {
    const noPartition = page
      .getByText(/不设置分区|不选择分区|无分区|全部分区/, { exact: false })
      .first();
    if (await noPartition.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await noPartition.click({ timeout: 30_000 });
    }
    return;
  }

  const radioText = page.getByText("选择已有分区", { exact: true }).first();
  if (await radioText.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await radioText.click({ timeout: 30_000 });
  }
  await selectFieldOption(page, /分区列表|选择分区|分区/, date, sourceRef, { required: false });
}

async function configureSampling(page: Page, build: UiCaseBuild, sourceRef: string): Promise<void> {
  const area = page.locator("body");
  if (!(await area.getByText(/抽样检查设置|抽样设置/).first().isVisible({ timeout: 5_000 }).catch(() => false))) return;
  const samplingSwitch = page.locator(".ant-switch:visible, [role='switch']:visible").last();
  if (await samplingSwitch.isVisible({ timeout: 3_000 }).catch(() => false)) {
    const checked =
      ((await samplingSwitch.getAttribute("class").catch(() => "")) ?? "").includes("checked") ||
      (await samplingSwitch.getAttribute("aria-checked").catch(() => "")) === "true";
    if (build.samplingEnabled && !checked) await samplingSwitch.click({ timeout: 30_000 });
    if (!build.samplingEnabled && checked) await samplingSwitch.click({ timeout: 30_000 });
  }
  if (!build.samplingEnabled) return;
  await selectFieldOption(page, /抽样方式|抽样类型/, "百分比抽样", sourceRef, { required: false });
  await fillSamplingRatio(page, "50", sourceRef);
  await fillPageFormField(page, /规则名称/, build.ruleName, sourceRef);
}

async function fillSamplingRatio(page: Page, value: string, sourceRef: string): Promise<void> {
  const field = page
    .locator(".ant-form-item:visible")
    .filter({ has: page.locator(".ant-form-item-label:visible").filter({ hasText: /抽样比例|百分比/ }) })
    .last();
  if (!(await field.isVisible({ timeout: 2_000 }).catch(() => false))) return;
  const input = field.locator("input:not([readonly]):not([disabled]):visible, .ant-input-number-input:not([disabled]):visible").last();
  await expect(input, `${sourceRef}: 抽样比例输入框应可见`).toBeVisible({ timeout: 30_000 });
  await input.fill(value, { timeout: 30_000 });
  await expect(input, `${sourceRef}: 抽样比例应为 ${value}`).toHaveValue(value, { timeout: 30_000 });
}

async function importRulePackage(
  page: Page,
  build: UiCaseBuild,
  sourceRef: string,
): Promise<void> {
  const expectedImportedRuleCount = expectedImportedRuleFormCount(build.ruleSpec);
  const packageField = await importFormItem(page, /规则包/, sourceRef);
  const packageSelect = packageField.locator(".ant-select:visible").first();
  await chooseMultipleFromSelect(page, packageSelect, [build.packageName], sourceRef, packageField);

  const ruleTypeField = await importFormItem(page, /规则类型/, sourceRef);
  const ruleTypeSelect = ruleTypeField.locator(".ant-select:visible").first();
  await chooseMultipleFromSelect(page, ruleTypeSelect, importRuleTypeOptions(build.ruleSpec), sourceRef, ruleTypeField);
  await test.info().attach(`${sourceRef}-rule-package-import-before-click.png`, {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
  await clickButton(page, /引\s*入/, sourceRef, { last: true, waitForSpin: false });
  const importedForms = page.locator(".ruleForm__form:visible");
  await expect(importedForms.first(), `${sourceRef}: 引入规则包后页面应渲染规则表单`).toBeVisible({
    timeout: Number(process.env.V6411_UI_IMPORT_FORM_TIMEOUT_MS ?? 3 * 60 * 1000),
  });
  await expect(page.getByRole("button", { name: /^下\s*一\s*步$/ }).last(), `${sourceRef}: 引入规则包后应可进入下一步`).toBeVisible({
    timeout: 30_000,
  });
  const importMessage = (
    (await page
      .locator(".ant-message-notice:visible, .ant-notification-notice:visible")
      .allInnerTexts()
      .catch(() => [])) ?? []
  ).join(" ");
  if (!/引入成功|成功/.test(importMessage)) {
    test.info().annotations.push({
      type: "warning",
      description: `${sourceRef}: 引入后未捕获成功 toast，但规则表单已渲染并可下一步；message=${importMessage}`,
    });
  }
  await test.info().attach(`${sourceRef}-rule-package-import-ui-dom.json`, {
    body: JSON.stringify(
      {
        expectedImportedRuleCount,
        sourceRuleCount: build.ruleSpec.expectedRuleCount,
        visibleRuleFormCount: await importedForms.count(),
        totalRuleFormCount: await page.locator(".ruleForm__form").count(),
        visibleRuleFormText: await importedForms
          .allInnerTexts()
          .then((items) => items.map((item) => item.replace(/\s+/g, " ").slice(0, 300)))
          .catch((error) => [`read visible rule form text failed: ${String(error)}`]),
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
  await expect(page.locator("body"), `${sourceRef}: 引入规则包后应展示包名`).toContainText(build.packageName, {
    timeout: 30_000,
  });
}

function importRuleTypeOptions(ruleSpec: V6411UiCaseSpec): string[] {
  const present = new Set(ruleSpec.rules.map((rule) => (isCustomSqlRule(rule) ? "自定义SQL" : rule.category)));
  return ["完整性校验", "有效性校验", "唯一性校验", "统计性校验", "自定义SQL", "一致性校验", "时效性校验", "合理性校验"].filter((item) =>
    present.has(item),
  );
}

function expectedImportedRuleFormCount(ruleSpec: V6411UiCaseSpec): number {
  const validityGroups = new Set<string>();
  let count = 0;
  for (const rule of ruleSpec.rules) {
    if (rule.category !== "有效性校验") {
      count += 1;
      continue;
    }
    validityGroups.add((rule.fields ?? []).join(",") || `rule-${rule.index}`);
  }
  return count + validityGroups.size;
}

async function importFormItem(page: Page, label: RegExp, sourceRef: string): Promise<Locator> {
  const item = page
    .locator(".ant-form-item:visible")
    .filter({
      has: page.locator(".ant-form-item-label:visible").filter({ hasText: label }),
    })
    .first();
  await expect(item, `${sourceRef}: 引入规则包区域应展示 ${label} 表单项`).toBeVisible({ timeout: 30_000 });
  return item;
}

async function setPackageCount(page: Page, value: number, sourceRef: string): Promise<void> {
  const field = page.locator(".ant-form-item:visible").filter({ hasText: /规则拼接包/ }).first();
  await expect(field, `${sourceRef}: 调度属性应展示规则拼接包`).toBeVisible({ timeout: 30_000 });
  const input = field.locator("input:visible").first();
  await expect(input, `${sourceRef}: 规则拼接包输入框应可见`).toBeVisible({ timeout: 30_000 });
  await fillInputLikeUser(input, String(value), `${sourceRef}: 规则拼接包`);
  await expect(input, `${sourceRef}: 规则拼接包应设置为 ${value}`).toHaveValue(String(value), { timeout: 30_000 });
  if (value >= 2) return;
  await page.waitForTimeout(500);
  const minError = field
    .locator(".ant-form-item-explain-error:visible, .ant-form-item-extra:visible")
    .filter({ hasText: /最小值不能小于2/ })
    .first();
  if (!(await minError.isVisible({ timeout: 1_000 }).catch(() => false))) return;
  await test.info().attach(`${sourceRef}-package-count-ui-min-adjustment.txt`, {
    body: `源用例规则拼接包=${value}，当前 UI 提示“最小值不能小于2”，本次正式 UI 自动化改填 2 后保存。`,
    contentType: "text/plain",
  });
  await fillInputLikeUser(input, "2", `${sourceRef}: UI 最小值限制下规则拼接包`);
  await expect(input, `${sourceRef}: UI 最小值限制下规则拼接包应改填 2`).toHaveValue("2", { timeout: 30_000 });
  await expect(minError, `${sourceRef}: 规则拼接包改填 2 后最小值错误应消失`).toBeHidden({ timeout: 30_000 });
}

async function setReportDataCycle(page: Page, sourceRef: string): Promise<void> {
  const field = page.locator(".ant-form-item:visible").filter({ hasText: /数据周期/ }).last();
  await expect(field, `${sourceRef}: 调度属性应展示报告数据周期`).toBeVisible({ timeout: 30_000 });
  const inputs = field.locator(".ant-input-number-input:not([disabled]):visible");
  await expect(inputs.first(), `${sourceRef}: 数据周期起始输入框应可见`).toBeVisible({ timeout: 30_000 });
  await expect(inputs.nth(1), `${sourceRef}: 数据周期结束输入框应可见`).toBeVisible({ timeout: 30_000 });
  await inputs.nth(0).fill("1", { timeout: 30_000 });
  await inputs.nth(1).fill("0", { timeout: 30_000 });
  await expect(inputs.nth(0), `${sourceRef}: 数据周期起始应为 1 天前`).toHaveValue("1", { timeout: 30_000 });
  await expect(inputs.nth(1), `${sourceRef}: 数据周期结束应为 0 天前`).toHaveValue("0", { timeout: 30_000 });
}

async function checkNoReport(page: Page, sourceRef: string): Promise<void> {
  const wrapper = page
    .locator(".ant-checkbox-wrapper:visible, label:visible")
    .filter({ hasText: "无需生成报告" })
    .first();
  await expect(wrapper, `${sourceRef}: 调度属性应展示无需生成报告`).toBeVisible({ timeout: 30_000 });
  const checkbox = wrapper.locator("input[type='checkbox']").first();
  if (!(await checkbox.isChecked({ timeout: 3_000 }).catch(() => false))) {
    await wrapper.click({ timeout: 30_000 });
  }
  await expect(checkbox, `${sourceRef}: 应通过 UI 勾选无需生成报告`).toBeChecked({ timeout: 30_000 });
}

async function waitForTaskSaveResult(
  page: Page,
  sourceRef: string,
  actionName: string,
  createdTask?: UiCaseBuild,
): Promise<void> {
  const observedResponses: string[] = [];
  const onResponse = (response: Response) => {
    const url = new URL(response.url());
    const path = `${url.pathname}${url.search ? "?" + url.search.replace(/([?&])(token|authorization|cookie)=[^&]*/gi, "$1[redacted]") : ""}`;
    if (response.status() >= 400 || /columnMeta|monitor\/edit/i.test(url.pathname)) {
      observedResponses.push(`${response.request().method()} ${response.status()} ${path}`);
    }
  };
  page.on("response", onResponse);
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  let bodyText = "";
  let validationText = "";
  let retryCount = 0;
  let nextRetryAt = Date.now() + 25_000;
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    await waitForSpin(page, sourceRef);
    bodyText = ((await page.locator("body").innerText({ timeout: 5_000 }).catch(() => "")) ?? "").replace(/\s+/g, " ");
    validationText = await readRuleSetValidationText(page);
    const transientSaveError = /接口调用异常|无法调用接口|网络异常|请求异常/.test(`${validationText} ${bodyText}`);
    if (validationText && !transientSaveError) break;
    const stillEditing = page.url().includes("/dq/rule/add") || page.url().includes("/dq/rule/edit");
    if (!stillEditing) {
      await expect(page.locator("body"), `${sourceRef}: ${actionName}保存后应提示成功或返回任务列表`).toContainText(
        /新建监控规则|规则任务管理/,
        { timeout: 60_000 },
      );
      return;
    }
    if ((transientSaveError || Date.now() >= nextRetryAt) && retryCount < 3) {
      if (createdTask && (await taskRecordExistsInProbePage(page, createdTask, sourceRef, actionName))) {
        await test.info().attach(`${sourceRef}-${actionName}-save-detected-existing-record.txt`, {
          body: `${actionName}保存后仍停留表单页，但任务列表已存在 ${createdTask.tableName} / ${createdTask.ruleName}，停止重复保存并回到任务列表。`,
          contentType: "text/plain",
        });
        await gotoDataQualityPage(page, "/dq/rule");
        return;
      }
      retryCount += 1;
      await test.info().attach(`${sourceRef}-${actionName}-save-retry-${retryCount}.txt`, {
        body: transientSaveError
          ? `${actionName}保存后出现瞬时接口异常，继续执行第 ${retryCount} 次 UI 保存重试。validation=${validationText}; body=${bodyText.slice(0, 1000)}`
          : `${actionName}保存后仍停留表单页，未发现校验错误，执行第 ${retryCount} 次 UI 保存重试。`,
        contentType: "text/plain",
      });
      await page.keyboard.press("Escape").catch(() => {});
      await clickButton(page, /^(保\s*存|新\s*建)$/, sourceRef, { last: true });
      await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
      nextRetryAt = Date.now() + 25_000;
    }
    await page.waitForTimeout(2_000);
  }
  await test.info().attach(`${sourceRef}-${actionName}-save-failed.png`, {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
  await test.info().attach(`${sourceRef}-${actionName}-save-failed-body.txt`, {
    body: bodyText,
    contentType: "text/plain",
  });
  await test.info().attach(`${sourceRef}-${actionName}-save-failed-responses.txt`, {
    body: observedResponses.length ? observedResponses.join("\n") : "no matching error/save responses observed",
    contentType: "text/plain",
  });
  page.off("response", onResponse);
  throw new Error(
    `${sourceRef}: ${actionName}保存后仍停留表单页，疑似保存失败或存在表单校验错误: validation=${validationText}; body=${bodyText.slice(0, 2000)}`,
  );
}

async function taskRecordExistsInProbePage(
  page: Page,
  build: UiCaseBuild,
  sourceRef: string,
  actionName: string,
): Promise<boolean> {
  const probe = await page.context().newPage();
  try {
    await gotoDataQualityPage(probe, "/dq/rule");
    await searchTable(probe, build.tableName, sourceRef);
    const row = probe.locator(".ant-table-tbody tr").filter({ hasText: build.tableName }).filter({ hasText: build.ruleName }).first();
    const exists = await row.isVisible({ timeout: 5_000 }).catch(() => false);
    if (exists) {
      await test.info().attach(`${sourceRef}-${actionName}-probe-existing-task-row.txt`, {
        body: await row.innerText({ timeout: 5_000 }).catch(() => ""),
        contentType: "text/plain",
      });
    }
    return exists;
  } catch (error) {
    await test.info().attach(`${sourceRef}-${actionName}-probe-existing-task-error.txt`, {
      body: error instanceof Error ? error.stack ?? error.message : String(error),
      contentType: "text/plain",
    });
    return false;
  } finally {
    await probe.close().catch(() => {});
  }
}

async function assertRuleSetListRecord(page: Page, build: UiCaseBuild, sourceRef: string): Promise<void> {
  await gotoDataQualityPage(page, "/dq/ruleSet");
  await searchTable(page, build.tableName, sourceRef);
  const row = await findRuleSetRowAcrossPages(page, build, sourceRef);
  if (!row) throw new Error(`${sourceRef}: 规则集列表应展示目标规则集`);
  await expect(row, `${sourceRef}: 规则集应展示数据源 ${build.datasourceName}`).toContainText(build.datasourceName, {
    timeout: 30_000,
  });
  const ruleCountCell = row.locator("td").nth(4);
  await expect(ruleCountCell, `${sourceRef}: 规则集应展示 ${build.ruleSpec.expectedRuleCount} 条规则`).toHaveText(
    new RegExp(`^\\s*${build.ruleSpec.expectedRuleCount}\\s*$`),
    { timeout: 30_000 },
  );
}

async function findRuleSetRowAcrossPages(page: Page, build: UiCaseBuild, sourceRef: string): Promise<Locator | null> {
  const totalText = await page
    .locator(".ant-pagination-total-text:visible")
    .last()
    .innerText({ timeout: 3_000 })
    .catch(() => "");
  const totalMatch = totalText.match(/共\s*(\d+)\s*条/);
  const totalCount = totalMatch ? Number(totalMatch[1]) : null;
  const configuredMaxPages = Number(process.env.V6411_UI_RULESET_SCAN_MAX_PAGES ?? 0);
  const maxPages = configuredMaxPages > 0 ? configuredMaxPages : totalCount ? Math.max(1, Math.ceil(totalCount / 20)) : 5;
  for (let pageIndex = 1; pageIndex <= maxPages; pageIndex += 1) {
    const rows = page.locator(".ant-table-tbody tr:visible");
    const rowTexts = await rows.allInnerTexts();
    const matchingIndex = rowTexts.findIndex((rowText) => rowText.includes(build.tableName));
    if (matchingIndex >= 0) return rows.nth(matchingIndex);

    const next = page.locator(".ant-pagination-next:visible").last();
    const nextClass = await next.getAttribute("class").catch(() => "");
    if (nextClass?.includes("ant-pagination-disabled")) break;
    if (!(await next.isVisible({ timeout: 2_000 }).catch(() => false))) break;
    await next.click({ timeout: 30_000 });
    await expect(page.locator(".ant-spin-spinning"), `${sourceRef}: 翻页后加载遮罩应消失`).toHaveCount(0, {
      timeout: Number(process.env.V6411_UI_SPIN_TIMEOUT_MS ?? 60_000),
    });
    await page.waitForTimeout(500);
  }
  return null;
}

async function moveToNextListPage(page: Page, next: Locator, sourceRef: string): Promise<void> {
  const activePage = page.locator(".ant-pagination-item-active:visible").last();
  const before = await activePage.innerText({ timeout: 2_000 }).catch(() => "");
  const firstRow = page.locator(".ant-table-tbody tr:visible").first();
  const beforeRow = await firstRow.innerText({ timeout: 2_000 }).catch(() => "");
  await next.click({ timeout: 30_000 });
  await expect
    .poll(
      async () => {
        const pageText = await activePage.innerText({ timeout: 2_000 }).catch(() => before);
        const rowText = await firstRow.innerText({ timeout: 2_000 }).catch(() => beforeRow);
        return `${pageText}\n${rowText}`;
      },
      { timeout: 15_000, message: `${sourceRef}: 列表翻页后页码或首行应变化` },
    )
    .not.toBe(`${before}\n${beforeRow}`);
  await page.waitForTimeout(500);
}

async function gotoDataQualityPage(page: Page, routePath: string): Promise<void> {
  await page.keyboard.press("Escape").catch(() => {});
  await page.locator(".ant-drawer-close:visible, .ant-modal-close:visible").last().click({ timeout: 2_000 }).catch(() => {});
  await page.addInitScript(
    (projectId) => {
      for (const key of ["X-Valid-Project-ID", "dq_project_id", "dataAssets_project_id", "currentProject"]) {
        sessionStorage.setItem(key, projectId);
        localStorage.setItem(key, projectId);
      }
    },
    PROJECT_ID,
  );
  const targetUrl = `${BASE_URL}/dataAssets/#${routePath}?pid=${PROJECT_ID}`;
  const appUrl = `${BASE_URL}/dataAssets/`;
  let responseStatus = 0;
  let lastGotoError = "";
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await page.goto(targetUrl, {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      responseStatus = response?.status() ?? 0;
      if (responseStatus < 500) {
        lastGotoError = "";
        break;
      }
      lastGotoError = `HTTP ${responseStatus}`;
    } catch (error) {
      lastGotoError = error instanceof Error ? error.message : String(error);
      try {
        const response = await page.goto(appUrl, {
          waitUntil: "domcontentloaded",
          timeout: 90_000,
        });
        responseStatus = response?.status() ?? 0;
        if (responseStatus < 500) {
          await page.evaluate(
            ([projectId, hash]) => {
              for (const key of ["X-Valid-Project-ID", "dq_project_id", "dataAssets_project_id", "currentProject"]) {
                sessionStorage.setItem(key, projectId);
                localStorage.setItem(key, projectId);
              }
              window.location.hash = hash;
            },
            [PROJECT_ID, `${routePath}?pid=${PROJECT_ID}`],
          );
          await page.waitForURL(new RegExp(`#${escapeRegExp(routePath)}(?:\\?|$)`), { timeout: 30_000 });
          lastGotoError = "";
          break;
        }
        lastGotoError = `fallback ${appUrl} HTTP ${responseStatus}; original=${lastGotoError}`;
      } catch (fallbackError) {
        lastGotoError = `original=${lastGotoError}; fallback=${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`;
      }
    }
    if (attempt < 3) {
      await test.info().attach(`${sourceRefFromRoute(routePath)}-goto-retry-${attempt}.txt`, {
        body: `target=${targetUrl}\nstatus=${responseStatus}\nerror=${lastGotoError}`,
        contentType: "text/plain",
      });
      await page.goto("about:blank", { waitUntil: "domcontentloaded", timeout: 30_000 }).catch(() => {});
      await page.waitForTimeout(3_000);
    }
  }
  if (responseStatus >= 500 || lastGotoError) {
    await test.info().attach(`${sourceRefFromRoute(routePath)}-goto-final.txt`, {
      body: `target=${targetUrl}\nstatus=${responseStatus}\nerror=${lastGotoError}`,
      contentType: "text/plain",
    });
    throw new Error(`${routePath}: 导航失败，target=${targetUrl}, status=${responseStatus}, error=${lastGotoError}`);
  }
  await page.evaluate((projectId) => {
    for (const key of ["X-Valid-Project-ID", "dq_project_id", "dataAssets_project_id", "currentProject"]) {
      sessionStorage.setItem(key, projectId);
      localStorage.setItem(key, projectId);
    }
  }, PROJECT_ID);
  await expect(page, `应导航到 ${routePath}`).toHaveURL(new RegExp(`#${escapeRegExp(routePath)}(?:\\?|$)`), {
    timeout: 30_000,
  });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await assertAuthenticated(page);
  await ensureQualityProjectSelected(page, sourceRefFromRoute(routePath));
  expect(responseStatus < 500, `${routePath}: HTTP 状态应小于 500；lastGotoError=${lastGotoError}`).toBe(true);
}

function sourceRefFromRoute(routePath: string): string {
  return `DQ-PAGE-${routePath}`;
}

async function ensureQualityProjectSelected(page: Page, sourceRef: string): Promise<void> {
  const body = page.locator("body");
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const notAddedVisible = await page
      .getByText(/暂未被添加至\s*质量项目/)
      .first()
      .isVisible({ timeout: 1_000 })
      .catch(() => false);
    const sider = page.locator(".ant-layout-sider:visible, aside:visible, [class*='sider']:visible").first();
    const siderText = ((await sider.innerText({ timeout: 2_000 }).catch(() => "")) ?? "").replace(/\s+/g, " ");
    if (siderText.includes(PROJECT_NAME) && !notAddedVisible) return;

    try {
      const projectSelect = page
        .locator(".ant-layout-sider:visible .ant-select:visible, aside:visible .ant-select:visible, [class*='sider']:visible .ant-select:visible")
        .first();
      await expect(projectSelect, `${sourceRef}: 应展示质量项目下拉`).toBeVisible({ timeout: 30_000 });
      const selected = await chooseFromSelect(page, projectSelect, PROJECT_NAME, sourceRef, { maxScrollAttempts: 8 });
      expect(selected, `${sourceRef}: 应能通过 UI 选择质量项目 ${PROJECT_NAME}`).toBe(true);
      await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
      await expect(body, `${sourceRef}: 质量项目应切换到 ${PROJECT_NAME}`).not.toContainText(/暂未被添加至\s*质量项目/, {
        timeout: 30_000,
      });
      return;
    } catch (error) {
      lastError = error;
      await test.info().attach(`${sourceRef}-project-select-reload-${attempt}.txt`, {
        body: `选择质量项目 ${PROJECT_NAME} 第 ${attempt} 次失败，刷新页面后重试。error=${String(error)}`,
        contentType: "text/plain",
      });
      await page.keyboard.press("Escape").catch(() => {});
      await page.reload({ waitUntil: "domcontentloaded", timeout: 90_000 }).catch(() => {});
      await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    }
  }
  throw lastError;
}

async function assertAuthenticated(page: Page): Promise<void> {
  const url = page.url();
  const loginTextVisible = await page
    .getByText(/欢迎登录产品中心|请输入注册账号|请输入密码/)
    .first()
    .isVisible({ timeout: 1_000 })
    .catch(() => false);
  if (!/\/uic\/#\/login|\/login/.test(url) && !loginTextVisible) return;
  throw new Error(
    `Cookie 已过期，请通过 kata env cookie set ${ENV.env} --stdin 更新后重试`,
  );
}

async function clickText(page: Page, text: string, sourceRef: string): Promise<void> {
  const item = page.getByText(text, { exact: true }).first();
  await expect(item, `${sourceRef}: 应展示文本入口「${text}」`).toBeVisible({ timeout: 30_000 });
  await item.click({ timeout: 30_000 });
}

async function clickButton(
  page: Page,
  label: RegExp,
  sourceRef: string,
  options: { last?: boolean; waitForSpin?: boolean } = {},
): Promise<void> {
  const buttons = page.locator("button:visible").filter({ hasText: label });
  const button = options.last ? buttons.last() : buttons.first();
  await expect(button, `${sourceRef}: 应展示按钮 ${label}`).toBeVisible({ timeout: 30_000 });
  await button.click({ force: true, timeout: 30_000 });
  if (options.waitForSpin !== false) await waitForSpin(page, sourceRef);
}

async function fillPageFormField(page: Page, label: RegExp, value: string, sourceRef: string): Promise<void> {
  const field = page.locator(".ant-form-item:visible").filter({ hasText: label }).first();
  await expect(field, `${sourceRef}: 应展示表单项 ${label}`).toBeVisible({ timeout: 30_000 });
  const input = field.locator("textarea:visible, input:visible").first();
  await expect(input, `${sourceRef}: 表单项 ${label} 应可输入`).toBeVisible({ timeout: 30_000 });
  await input.fill(value, { timeout: 30_000 });
  await expect(input, `${sourceRef}: 表单项 ${label} 应回显`).toHaveValue(value, { timeout: 30_000 });
}

async function selectFormOption(page: Page, label: RegExp, option: string, sourceRef: string): Promise<void> {
  const field = page.locator(".ant-form-item:visible").filter({ hasText: label }).first();
  await expect(field, `${sourceRef}: 应展示表单项 ${label}`).toBeVisible({ timeout: 30_000 });
  const normalizedOption = option.replace(/\s+/g, "");
  const currentText = (
    (await field
      .locator(".ant-select-selection-item:visible, .ant-select-selection-item-content:visible")
      .first()
      .innerText({ timeout: 1_000 })
      .catch(() => "")) ?? ""
  ).replace(/\s+/g, "");
  if (currentText.includes(normalizedOption)) return;

  const select = field.locator(".ant-select:visible").first();
  await expect(select, `${sourceRef}: 表单项 ${label} 应展示下拉`).toBeVisible({ timeout: 30_000 });
  await chooseFromSelect(page, select, option, sourceRef);

  const selectedText = ((await field.innerText({ timeout: 10_000 }).catch(() => "")) ?? "").replace(/\s+/g, "");
  expect(
    selectedText,
    `${sourceRef}: 表单项 ${label} 应精确回显 ${option}，实际=${selectedText}`,
  ).toContain(normalizedOption);
}

async function selectExactFormOption(page: Page, labelText: string, option: string, sourceRef: string): Promise<void> {
  const field = page
    .locator(".ant-form-item:visible")
    .filter({ has: page.locator("label:visible").filter({ hasText: new RegExp(`^${escapeRegExp(labelText)}$`) }) })
    .first();
  await expect(field, `${sourceRef}: 应展示表单项 ${labelText}`).toBeVisible({ timeout: 30_000 });
  const select = field.locator(".ant-select:visible").first();
  await expect(select, `${sourceRef}: 表单项 ${labelText} 应展示下拉`).toBeVisible({ timeout: 30_000 });
  await chooseFromSelectWithRetry(page, select, option, sourceRef, 3);
  const selectedText = (
    (await field
      .locator(".ant-select-selection-item:visible, .ant-select-selection-item-content:visible")
      .first()
      .innerText({ timeout: 10_000 })
      .catch(() => "")) ?? ""
  ).replace(/\s+/g, "");
  if (selectedText) {
    expect(selectedText, `${sourceRef}: 表单项 ${labelText} 应精确回显 ${option}`).toContain(option.replace(/\s+/g, ""));
  } else {
    test.info().annotations.push({
      type: "note",
      description: `${sourceRef}: 表单项 ${labelText} 已点击 ${option}，但 AntD 可见回显为空，继续由后续联动请求验证`,
    });
  }
}

async function selectDataTableFormOption(page: Page, tableName: string, sourceRef: string): Promise<void> {
  const field = page.locator(".ant-form-item:visible").filter({ hasText: /数据表/ }).last();
  await expect(field, `${sourceRef}: 应展示数据表表单项`).toBeVisible({ timeout: 30_000 });
  await selectDataTableFromField(page, field, tableName, sourceRef, "数据表");
}

async function selectRuleSetDataTableFormOption(page: Page, tableName: string, sourceRef: string): Promise<void> {
  const field = page
    .locator(".ant-form-item:visible")
    .filter({ has: page.locator("label:visible").filter({ hasText: /^选择数据表$/ }) })
    .first();
  await expect(field, `${sourceRef}: 规则集基础信息应展示选择数据表表单项`).toBeVisible({ timeout: 30_000 });
  await selectDataTableFromField(page, field, tableName, sourceRef);
}

async function selectDataTableFromField(
  page: Page,
  field: Locator,
  tableName: string,
  sourceRef: string,
  label = "规则集选择数据表",
  selectIndex = 0,
): Promise<void> {
  const deadline = Date.now() + Number(process.env.V6411_UI_TABLE_OPTION_TIMEOUT_MS ?? 300_000);
  let lastDropdownText = "";
  while (Date.now() < deadline) {
    const select = field.locator(".ant-select:visible").nth(selectIndex);
    await expect(select, `${sourceRef}: ${label}下拉应可见`).toBeVisible({ timeout: 30_000 });
    await select.click({ force: true, timeout: 30_000 });
    const searchInput = select.locator("input.ant-select-selection-search-input, input[role='combobox']").first();
    if (await searchInput.isVisible({ timeout: 1_500 }).catch(() => false)) {
      await searchInput.focus().catch(() => {});
      await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A").catch(() => {});
      await page.keyboard.press("Backspace").catch(() => {});
      await page.keyboard.type(tableName, { delay: 20 });
    } else {
      await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A").catch(() => {});
      await page.keyboard.press("Backspace").catch(() => {});
      await page.keyboard.type(tableName, { delay: 20 });
    }
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(3_000);
    const dropdown = page.locator(".ant-select-dropdown:visible").last();
    lastDropdownText = ((await dropdown.innerText({ timeout: 5_000 }).catch(() => "")) ?? "").replace(/\s+/g, " ");
    const target = dropdown
      .locator(".ant-select-item-option:not(.ant-select-item-option-disabled):visible")
      .filter({ hasText: new RegExp(`^\\s*${escapeRegExp(tableName)}\\s*$`, "i") })
      .first();
    if (!(await target.isVisible({ timeout: 2_000 }).catch(() => false))) {
      await page.waitForTimeout(2_000);
    }
    if (await target.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await target.click({ timeout: 30_000 });
      await waitForSpin(page, sourceRef);
      const text = ((await field.textContent({ timeout: 5_000 }).catch(() => "")) ?? "").replace(/\s+/g, "");
      if (text.includes(tableName)) return;
    }
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(10_000);
  }
  throw new Error(`${sourceRef}: ${label}下拉在等待后仍不包含 ${tableName}; lastDropdown=${lastDropdownText}`);
}

function rootPage(root: UiSearchRoot): Page {
  return typeof (root as Locator).page === "function" ? (root as Locator).page() : (root as Page);
}

function optionTextCandidates(option: string): string[] {
  const normalized = option.replace(/\s+/g, "");
  const candidates = [option];
  if (normalized === "字段取值校验") {
    candidates.push("字段取值校", "字段取值范围校验");
  }
  return [...new Set(candidates)];
}

function optionExactTextRegex(option: string): RegExp {
  return new RegExp(`^\\s*(?:${optionTextCandidates(option).map(escapeRegExp).join("|")})\\s*$`, "i");
}

function optionContainsTextRegex(option: string): RegExp {
  return new RegExp(optionTextCandidates(option).map(escapeRegExp).join("|"), "i");
}

function selectedTextMatchesOption(selectedText: string, option: string): boolean {
  const normalizedSelected = selectedText.replace(/\s+/g, "");
  return optionTextCandidates(option).some((candidate) => normalizedSelected.includes(candidate.replace(/\s+/g, "")));
}

async function selectAnyOption(
  root: UiSearchRoot,
  label: RegExp,
  option: string,
  sourceRef: string,
  fallbacks: string[] = [],
): Promise<boolean> {
  const alternatives = option === "and" ? ["and", "且", ...fallbacks] : option === "or" ? ["or", "或", ...fallbacks] : [option, ...fallbacks];
  for (const item of alternatives) {
    if (await selectFieldOption(root, label, item, sourceRef, { required: false })) return true;
  }
  return false;
}

async function selectFieldOption(
  root: UiSearchRoot,
  label: RegExp,
  option: string,
  sourceRef: string,
  options: SelectOptionOptions = {},
): Promise<boolean> {
  const page = rootPage(root);
  const formItemLocator = root.locator(".ant-form-item:visible").filter({ hasText: label });
  const rowLocator = root.locator(".ant-row:visible").filter({ hasText: label });
  let field = options.first ? formItemLocator.first() : formItemLocator.last();
  if (!(await field.isVisible({ timeout: 500 }).catch(() => false))) {
    field = options.first ? rowLocator.first() : rowLocator.last();
  }
  if (!(await field.isVisible({ timeout: options.required === false ? 1_500 : 30_000 }).catch(() => false))) {
    if (options.required === false) return false;
    await expect(field, `${sourceRef}: 应展示配置项 ${label}`).toBeVisible({ timeout: 30_000 });
  }
  const selectedText = (
    (await field
      .locator(".ant-select-selection-item:visible, .ant-select-selection-item-content:visible")
      .first()
      .innerText({ timeout: 1_000 })
      .catch(() => "")) ?? ""
  ).replace(/\s+/g, "");
  if (selectedTextMatchesOption(selectedText, option)) return true;
  const select = field.locator(".ant-select:visible").first();
  if (await select.isVisible({ timeout: 2_000 }).catch(() => false)) {
    return await chooseFromSelect(page, select, option, sourceRef, options);
  }
  const direct = field.getByText(option, { exact: false }).first();
  if (await direct.isVisible({ timeout: 1_500 }).catch(() => false)) {
    await direct.click({ timeout: 30_000 });
    return true;
  }
  if (options.required === false) return false;
  throw new Error(`${sourceRef}: 配置项 ${label} 无法选择 ${option}`);
}

async function chooseAnyFromSelect(page: Page, select: Locator, options: string[], sourceRef: string): Promise<string> {
  for (const option of options) {
    if (await chooseFromSelect(page, select, option, sourceRef, { required: false })) return option;
  }
  throw new Error(`${sourceRef}: 下拉无法选择任一候选值 ${options.join(" / ")}`);
}

async function chooseFromVisibleDropdown(page: Page, option: string, sourceRef: string): Promise<void> {
  const dropdown = page.locator(".ant-select-dropdown:visible").last();
  await expect(dropdown, `${sourceRef}: 应展示已打开下拉`).toBeVisible({ timeout: 10_000 });
  const target = dropdown
    .locator(".ant-select-item-option:not(.ant-select-item-option-disabled):visible")
    .filter({ hasText: optionExactTextRegex(option) })
    .first();
  const treeTarget = dropdown
    .locator(".ant-select-tree-node-content-wrapper:visible, .ant-tree-node-content-wrapper:visible")
    .filter({ hasText: optionExactTextRegex(option) })
    .first();
  if (await treeTarget.isVisible({ timeout: 1_500 }).catch(() => false)) {
    await treeTarget.click({ timeout: 30_000 });
  } else {
    await expect(target, `${sourceRef}: 已打开下拉应包含 ${option}`).toBeVisible({ timeout: 30_000 });
    await target.click({ timeout: 30_000 });
  }
  await waitForSpin(page, sourceRef);
}

async function chooseFromSelectWithRetry(page: Page, select: Locator, option: string, sourceRef: string, attempts: number): Promise<void> {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const selected = await chooseFromSelect(page, select, option, sourceRef, { required: false });
    if (selected) return;
    await page.waitForTimeout(1_000 * attempt);
    await waitForSpin(page, sourceRef);
  }
  await chooseFromSelect(page, select, option, sourceRef);
}

async function chooseMultipleFromSelect(
  page: Page,
  select: Locator,
  options: string[],
  sourceRef: string,
  assertContainer: Locator = select,
): Promise<void> {
  const selector = select.locator(".ant-select-selector").first();
  await expect(selector, `${sourceRef}: 多选下拉 selector 应可见`).toBeVisible({ timeout: 30_000 });
  for (const option of options) {
    if (await assertContainer.getByText(option, { exact: true }).isVisible({ timeout: 500 }).catch(() => false)) continue;
    await selector.click({ timeout: 30_000 });
    const searchInput = select.locator("input.ant-select-selection-search-input, input[role='combobox']").first();
    if (await searchInput.isVisible({ timeout: 1_000 }).catch(() => false)) await searchInput.focus().catch(() => {});
    await page.keyboard.type(option, { delay: 20 });
    await page.waitForTimeout(500);
    const dropdown = page.locator(".ant-select-dropdown:visible").last();
    let target = dropdown
      .locator(".ant-select-item-option:not(.ant-select-item-option-disabled):visible")
      .filter({ hasText: optionExactTextRegex(option) })
      .first();
    if (!(await target.isVisible({ timeout: 1_000 }).catch(() => false))) {
      target = dropdown
        .locator(".ant-select-item-option:not(.ant-select-item-option-disabled):visible")
        .filter({ hasText: optionContainsTextRegex(option) })
        .first();
    }
    const treeTarget = dropdown
      .locator(".ant-select-tree-node-content-wrapper:visible, .ant-tree-node-content-wrapper:visible")
      .filter({ hasText: optionExactTextRegex(option) })
      .first();
    if (await treeTarget.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await treeTarget.click({ timeout: 30_000 });
    } else {
      await expect(target, `${sourceRef}: 多选下拉应包含 ${option}`).toBeVisible({ timeout: 30_000 });
      await target.click({ timeout: 30_000 });
    }
    await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(500);
    await expect(assertContainer, `${sourceRef}: 多选下拉应保留 ${option}`).toContainText(option, { timeout: 30_000 });
  }
  await page.keyboard.press("Escape").catch(() => {});
}

async function chooseFromSelect(
  page: Page,
  select: Locator,
  option: string,
  sourceRef: string,
  options: SelectOptionOptions = {},
): Promise<boolean> {
  const attempts = options.required === false ? 1 : 3;
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await chooseFromSelectOnce(page, select, option, sourceRef, options);
    } catch (error) {
      lastError = error;
      if (attempt >= attempts) break;
      await test.info().attach(`${sourceRef}-select-${sanitizeAttachmentName(option)}-retry-${attempt}.txt`, {
        body: `下拉选择 ${option} 第 ${attempt} 次失败，关闭下拉后等待联动加载再重试。error=${String(error)}`,
        contentType: "text/plain",
      });
      await page.keyboard.press("Escape").catch(() => {});
      await page.waitForTimeout(2_000 * attempt);
    }
  }
  throw lastError;
}

async function chooseFromSelectOnce(
  page: Page,
  select: Locator,
  option: string,
  sourceRef: string,
  options: SelectOptionOptions = {},
): Promise<boolean> {
  await page.keyboard.press("Escape").catch(() => {});
  await select.click({ force: true, timeout: 30_000 });
  const openedDropdown = page.locator(".ant-select-dropdown:visible").last();
  const directTarget = openedDropdown
    .locator(".ant-select-item-option:not(.ant-select-item-option-disabled):visible")
    .filter({ hasText: optionExactTextRegex(option) })
    .first();
  const directTreeTarget = openedDropdown
    .locator(".ant-select-tree-node-content-wrapper:visible, .ant-tree-node-content-wrapper:visible")
    .filter({ hasText: optionExactTextRegex(option) })
    .first();
  if (await directTreeTarget.isVisible({ timeout: 800 }).catch(() => false)) {
    if (await clickSelectDropdownOption(page, select, directTreeTarget, option, sourceRef)) return true;
  }
  if (await directTarget.isVisible({ timeout: 800 }).catch(() => false)) {
    if (await clickSelectDropdownOption(page, select, directTarget, option, sourceRef)) return true;
  }
  const searchInput = select.locator("input.ant-select-selection-search-input, input[role='combobox']").first();
  if (await searchInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
    const readOnly = await searchInput
      .evaluate((element) => (element as HTMLInputElement).readOnly || element.hasAttribute("readonly"))
      .catch(() => false);
    if (!readOnly) {
      await searchInput.fill(option, { timeout: 3_000 }).catch(async () => {
        await searchInput.focus().catch(() => {});
        await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A").catch(() => {});
        await page.keyboard.type(option);
      });
    } else {
      await searchInput.focus().catch(() => {});
      await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A").catch(() => {});
      await page.keyboard.type(option);
    }
  } else {
    await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A").catch(() => {});
    await page.keyboard.type(option);
  }
  await page.waitForTimeout(800);
  const dropdown = page.locator(".ant-select-dropdown:visible").last();
  let target = dropdown
    .locator(".ant-select-item-option:not(.ant-select-item-option-disabled):visible")
    .filter({ hasText: optionExactTextRegex(option) })
    .first();
  if (!(await target.isVisible({ timeout: 1_000 }).catch(() => false))) {
    target = dropdown
      .locator(".ant-select-item-option:not(.ant-select-item-option-disabled):visible")
      .filter({ hasText: optionContainsTextRegex(option) })
      .first();
  }
  const treeTarget = dropdown
    .locator(".ant-select-tree-node-content-wrapper:visible, .ant-tree-node-content-wrapper:visible")
    .filter({ hasText: optionExactTextRegex(option) })
    .first();
  if (await treeTarget.isVisible({ timeout: 1_000 }).catch(() => false)) {
    const clicked = await clickSelectDropdownOption(page, select, treeTarget, option, sourceRef);
    if (clicked) return true;
    if (options.required === false) return false;
  }
  if (options.required !== false && !(await target.isVisible({ timeout: 3_000 }).catch(() => false))) {
    await scrollDropdownToOption(dropdown, option, options.maxScrollAttempts ?? 40);
  }
  if (!(await target.isVisible({ timeout: options.required === false ? 3_000 : 30_000 }).catch(() => false))) {
    const dropdownText = ((await dropdown.innerText({ timeout: 3_000 }).catch(() => "")) ?? "").replace(/\s+/g, " ");
    await page.keyboard.press("Escape").catch(() => {});
    if (options.required === false) return false;
    await expect(target, `${sourceRef}: 下拉应包含 ${option}; 当前下拉=${dropdownText}`).toBeVisible({ timeout: 30_000 });
  }
  const clicked = await clickSelectDropdownOption(page, select, target, option, sourceRef);
  if (clicked) return true;
  if (options.required === false) return false;
  const dropdownText = ((await dropdown.innerText({ timeout: 3_000 }).catch(() => "")) ?? "").replace(/\s+/g, " ");
  throw new Error(`${sourceRef}: 下拉选项 ${option} 存在但无法选中; 当前下拉=${dropdownText}`);
}

async function clickSelectDropdownOption(
  page: Page,
  select: Locator,
  target: Locator,
  option: string,
  sourceRef: string,
): Promise<boolean> {
  for (const clickOptions of [
    { timeout: 4_000 },
    { force: true, timeout: 4_000 },
  ] as const) {
    await target.scrollIntoViewIfNeeded({ timeout: 1_000 }).catch(() => {});
    const clicked = await target.click(clickOptions).then(() => true).catch(() => false);
    if (!clicked) continue;
    await attachSelectClickDiagnosticIfUnsettled(page, select, option, sourceRef);
    await waitForSelectSpinToSettle(page, sourceRef, option);
    return true;
  }

  await page.keyboard.press("Enter").catch(() => {});
  await waitForSelectSpinToSettle(page, sourceRef, option);
  const selectedText = (
    (await select
      .locator(".ant-select-selection-item:visible, .ant-select-selection-item-content:visible")
      .first()
      .innerText({ timeout: 1_000 })
      .catch(() => "")) ?? ""
  ).replace(/\s+/g, "");
  if (selectedTextMatchesOption(selectedText, option)) return true;
  const dropdownVisible = await page.locator(".ant-select-dropdown:visible").last().isVisible({ timeout: 500 }).catch(() => false);
  return !dropdownVisible;
}

async function attachSelectClickDiagnosticIfUnsettled(
  page: Page,
  select: Locator,
  option: string,
  sourceRef: string,
): Promise<void> {
  const selectedItem = select.locator(".ant-select-selection-item:visible, .ant-select-selection-item-content:visible").first();
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const selectedText = (
      (await selectedItem.innerText({ timeout: 500 }).catch(() => "")) ?? ""
    ).replace(/\s+/g, "");
    if (selectedTextMatchesOption(selectedText, option)) return;
    const dropdownVisible = await page.locator(".ant-select-dropdown:visible").last().isVisible({ timeout: 300 }).catch(() => false);
    if (!dropdownVisible) return;
    await page.waitForTimeout(300);
  }
  const selectedText = ((await selectedItem.innerText({ timeout: 1_000 }).catch(() => "")) ?? "").replace(/\s+/g, "");
  const dropdownText = ((await page.locator(".ant-select-dropdown:visible").last().innerText({ timeout: 1_000 }).catch(() => "")) ?? "")
    .replace(/\s+/g, " ")
    .slice(0, 1000);
  await test.info().attach(`${sourceRef}-select-${sanitizeAttachmentName(option)}-unsettled-after-click.txt`, {
    body: `下拉选项已点击，但 10s 内未通过通用 selector 观察到回显或下拉关闭；继续交给后续 UI 保存/校验判断。selected=${selectedText}; dropdown=${dropdownText}`,
    contentType: "text/plain",
  });
}

async function waitForSelectSpinToSettle(page: Page, sourceRef: string, option: string): Promise<void> {
  try {
    await waitForSpin(page, sourceRef, Number(process.env.V6411_UI_SELECT_SPIN_TIMEOUT_MS ?? 8_000));
  } catch (error) {
    await test.info().attach(`${sourceRef}-select-${sanitizeAttachmentName(option)}-persistent-spin.txt`, {
      body: `下拉选择 ${option} 已完成，但页面仍存在可见 ant-spin-spinning；后续字段会继续用 UI 断言校验。error=${String(error)}`,
      contentType: "text/plain",
    });
  }
}

async function scrollDropdownToOption(dropdown: Locator, option: string, maxAttempts: number): Promise<void> {
  const page = dropdown.page();
  const holder = dropdown.locator(".rc-virtual-list-holder, .ant-select-dropdown").first();
  if (!(await holder.isVisible({ timeout: 1_000 }).catch(() => false))) return;
  await holder
    .evaluate((element) => {
      element.scrollTop = 0;
    })
    .catch(() => {});
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const target = dropdown
      .locator(".ant-select-item-option:not(.ant-select-item-option-disabled):visible")
      .filter({ hasText: optionContainsTextRegex(option) })
      .first();
    if (await target.isVisible({ timeout: 300 }).catch(() => false)) return;
    const scrolled = await holder
      .evaluate((element) => {
        const before = element.scrollTop;
        element.scrollTop += element.clientHeight || 240;
        return element.scrollTop !== before;
      })
      .catch(() => false);
    if (!scrolled) await page.mouse.wheel(0, 600).catch(() => {});
    await page.waitForTimeout(200);
  }
}

async function fillFieldInput(
  root: UiSearchRoot,
  label: RegExp,
  value: string,
  sourceRef: string,
  options: { required?: boolean } = {},
): Promise<boolean> {
  const field = root.locator(".ant-form-item:visible, .ant-row:visible").filter({ hasText: label }).last();
  if (!(await field.isVisible({ timeout: options.required === false ? 1_500 : 30_000 }).catch(() => false))) {
    if (options.required === false) return false;
    await expect(field, `${sourceRef}: 应展示输入项 ${label}`).toBeVisible({ timeout: 30_000 });
  }
  const input = field
    .locator(
      [
        "textarea:not([disabled]):visible",
        'input:not([readonly]):not([disabled]):not([type="radio"]):not([type="checkbox"]):not(.ant-select-selection-search-input):visible',
        ".ant-input-number-input:not([disabled]):visible",
      ].join(", "),
    )
    .last();
  if (!(await input.isVisible({ timeout: options.required === false ? 1_500 : 30_000 }).catch(() => false))) {
    if (options.required === false) return false;
    await expect(input, `${sourceRef}: 输入项 ${label} 应有可编辑控件`).toBeVisible({ timeout: 30_000 });
  }
  await input.fill(value, { timeout: 30_000 });
  return true;
}

async function fillParameterLikeInput(
  root: UiSearchRoot,
  paramName: string,
  value: string,
  sourceRef: string,
  options: { required?: boolean } = {},
): Promise<boolean> {
  let row = root.locator(".ant-table-tbody tr").filter({ hasText: paramName }).first();
  if (!(await row.isVisible({ timeout: 500 }).catch(() => false))) {
    row = root.locator(".ant-row:visible, .ant-form-item:visible").filter({ hasText: paramName }).last();
  }
  if (!(await row.isVisible({ timeout: options.required === false ? 1_500 : 30_000 }).catch(() => false))) {
    if (options.required === false) return false;
    await expect(row, `${sourceRef}: 自定义 SQL 参数 ${paramName} 应出现`).toBeVisible({ timeout: 30_000 });
  }
  const input = row.locator("textarea:visible, input:visible:not(.ant-select-selection-search-input):not([role='combobox'])").last();
  if (await input.isVisible({ timeout: 1_500 }).catch(() => false)) {
    const current = await input.inputValue({ timeout: 1_000 }).catch(() => "");
    if (current === value) return true;
    const readonly = await input
      .evaluate((element) => {
        const inputElement = element as HTMLInputElement | HTMLTextAreaElement;
        return inputElement.disabled || inputElement.readOnly || inputElement.hasAttribute("disabled") || inputElement.hasAttribute("readonly");
      })
      .catch(() => false);
    if (readonly) {
      if (options.required === false) return false;
      throw new Error(`${sourceRef}: 自定义 SQL 参数 ${paramName} 当前值为 ${current}，控件不可编辑，无法改为 ${value}`);
    }
    await input.fill(value, { timeout: 30_000 });
    return true;
  }
  const select = row.locator(".ant-select:visible").last();
  if (await select.isVisible({ timeout: 1_500 }).catch(() => false)) {
    const selected = await chooseFromSelect(rootPage(root), select, value, sourceRef, options);
    if (selected) {
      await expect(
        select.locator(".ant-select-selection-item:visible, .ant-select-selection-item-content:visible").first(),
        `${sourceRef}: 自定义 SQL 参数 ${paramName} 应回显 ${value}`,
      ).toContainText(value, { timeout: 30_000 });
    }
    return selected;
  }
  return await selectFieldOption(root, new RegExp(paramName), value, sourceRef, options);
}

async function selectFirstOption(
  page: Page,
  label: RegExp,
  sourceRef: string,
  options: { required?: boolean } = {},
): Promise<boolean> {
  let field = page
    .locator(".ant-form-item:visible")
    .filter({ has: page.locator(".ant-form-item-label:visible").filter({ hasText: label }) })
    .last();
  if (!(await field.isVisible({ timeout: 1_500 }).catch(() => false))) {
    field = page.locator(".ant-form-item:visible").filter({ hasText: label }).last();
  }
  if (!(await field.isVisible({ timeout: options.required === false ? 1_500 : 30_000 }).catch(() => false))) {
    if (options.required === false) return false;
    await expect(field, `${sourceRef}: 应展示配置项 ${label}`).toBeVisible({ timeout: 30_000 });
  }
  const select = field.locator(".ant-select:visible").first();
  if (!(await select.isVisible({ timeout: 1_500 }).catch(() => false))) return false;
  await select.click({ timeout: 30_000 });
  const option = page.locator(".ant-select-dropdown:visible .ant-select-item-option:not(.ant-select-item-option-disabled):visible").first();
  await expect(option, `${sourceRef}: ${label} 应有可选项`).toBeVisible({ timeout: 30_000 });
  const clicked = (await option.click({ timeout: 4_000 }).then(() => true).catch(() => false))
    || (await option.click({ force: true, timeout: 4_000 }).then(() => true).catch(() => false));
  if (!clicked) await page.keyboard.press("Enter").catch(() => {});
  await waitForSpin(page, sourceRef);
  return true;
}

async function selectResourceGroup(page: Page, sourceRef: string, options: { required?: boolean } = {}): Promise<void> {
  const requestedResourceGroup = process.env.V6411_UI_RESOURCE_GROUP?.trim();
  let field = page
    .locator(".ant-form-item:visible")
    .filter({ has: page.locator(".ant-form-item-label:visible").filter({ hasText: /资源组/ }) })
    .last();
  if (!(await field.isVisible({ timeout: 2_000 }).catch(() => false))) {
    field = page.locator(".ant-form-item:visible").filter({ hasText: /资源组/ }).last();
  }
  if (!(await field.isVisible({ timeout: options.required === false ? 2_000 : 30_000 }).catch(() => false))) {
    if (options.required === false) {
      await test.info().attach(`${sourceRef}-resource-group-absent.txt`, {
        body: ((await page.locator("main, body").first().innerText({ timeout: 3_000 }).catch(() => "")) ?? "").replace(/\s+/g, " "),
        contentType: "text/plain",
      });
      return;
    }
    await expect(field, `${sourceRef}: 调度属性页必须展示资源组`).toBeVisible({ timeout: 30_000 });
  }

  const selection = field.locator(".ant-select-selection-item:visible, .ant-select-selection-item-content:visible").first();
  const existing = ((await selection.innerText({ timeout: 1_000 }).catch(() => "")) ?? "").trim();
  if (existing && !/请选择/.test(existing)) return;

  const select = field.locator(".ant-select:visible").first();
  await expect(select, `${sourceRef}: 资源组下拉必须可见`).toBeVisible({ timeout: 30_000 });

  await page.keyboard.press("Escape").catch(() => {});
  await select.click({ force: true, timeout: 30_000 });
  const dropdown = page.locator(".ant-select-dropdown:visible").last();
  await expect(dropdown, `${sourceRef}: 资源组下拉必须展开`).toBeVisible({ timeout: 30_000 });
  const availableOptions = dropdown.locator(".ant-select-item-option:not(.ant-select-item-option-disabled):visible");
  let option = requestedResourceGroup
    ? availableOptions.filter({ hasText: new RegExp(`^\\s*${escapeRegExp(requestedResourceGroup)}\\s*$`, "i") }).first()
    : availableOptions.filter({ hasText: /default/i }).first();
  if (!requestedResourceGroup && !(await option.isVisible({ timeout: 5_000 }).catch(() => false))) {
    option = availableOptions.first();
  }
  const dropdownText = ((await dropdown.innerText({ timeout: 3_000 }).catch(() => "")) ?? "").replace(/\s+/g, " ");
  await expect(option, `${sourceRef}: 资源组应包含 ${requestedResourceGroup ?? "default/首个可用项"}; 当前下拉=${dropdownText}`).toBeVisible({
    timeout: 30_000,
  });
  const optionText = ((await option.innerText({ timeout: 3_000 }).catch(() => "")) ?? "").replace(/\s+/g, " ").trim();
  const selected =
    (await option.click({ timeout: 4_000 }).then(() => true).catch(() => false)) ||
    (await option.click({ force: true, timeout: 4_000 }).then(() => true).catch(() => false));
  if (!selected) await page.keyboard.press("Enter").catch(() => {});

  const selectedItem = field.locator(".ant-select-selection-item:visible, .ant-select-selection-item-content:visible").first();
  await expect(selectedItem, `${sourceRef}: 资源组必须已通过 UI 选中 ${optionText}`).not.toHaveText(
    /^\s*请选择资源组\s*$/,
    { timeout: 30_000 },
  );
  await waitForSelectSpinToSettle(page, sourceRef, `资源组-${optionText}`);
  const selectedText = ((await selectedItem.innerText({ timeout: 3_000 }).catch(() => "")) ?? "").trim();
  expect(selectedText.length, `${sourceRef}: 资源组选中后回显不能为空; option=${optionText}`).toBeGreaterThan(0);
  await expect(field.locator(".ant-form-item-explain-error:visible"), `${sourceRef}: 资源组不应存在校验错误`).toHaveCount(0, {
    timeout: 30_000,
  });
}

async function searchTable(page: Page, tableName: string, sourceRef: string): Promise<void> {
  const input = page
    .getByPlaceholder(/输入表名搜索|请输入表名\/任务名称搜索|请输入表名|表名/)
    .or(page.locator("input[placeholder*='表名']"))
    .first();
  await expect(input, `${sourceRef}: 列表应展示搜索输入框`).toBeVisible({ timeout: 30_000 });
  await input.click({ timeout: 30_000 });
  await input.fill(tableName, { timeout: 30_000 });
  await expect(input, `${sourceRef}: 搜索框应回显 ${tableName}`).toHaveValue(tableName, { timeout: 30_000 });
  let search = input
    .locator("xpath=ancestor::*[contains(@class, 'ant-input-search')][1]")
    .locator("button:visible")
    .filter({ has: page.locator(".anticon-search") })
    .first();
  if (!(await search.isVisible({ timeout: 2_000 }).catch(() => false))) {
    search = page.locator("button:visible").filter({ has: page.locator(".anticon-search") }).first();
  }
  await expect(search, `${sourceRef}: 列表应展示可见搜索按钮`).toBeVisible({ timeout: 30_000 });
  await search.click({ timeout: 30_000 });
  await waitForSpin(page, sourceRef);
  await page.waitForTimeout(1_000);
  await attachVisibleTableRows(page, `${sourceRef}-search-${sanitizeAttachmentName(tableName)}-rows.txt`);
}

async function attachVisibleTableRows(page: Page, name: string): Promise<void> {
  const rows = await page
    .locator(".ant-table-tbody tr:visible")
    .evaluateAll((items) =>
      items
        .map((item) => (item.textContent ?? "").replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .slice(0, 30),
    )
    .catch((error) => [`<failed to read rows: ${String(error)}>`]);
  await test.info().attach(name, {
    body: rows.length ? rows.join("\n") : "<no visible rows>",
    contentType: "text/plain",
  });
}

function sanitizeAttachmentName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 80);
}

async function runTaskImmediatelyFromUi(page: Page, row: Locator, sourceRef: string): Promise<void> {
  let execute = row.getByRole("button", { name: /立即执行/ }).or(row.getByText("立即执行")).first();
  if (!(await execute.isVisible({ timeout: 3_000 }).catch(() => false))) {
    execute = row.locator("a:visible, button:visible").filter({ hasText: /立即执行/ }).first();
  }
  if (!(await execute.isVisible({ timeout: 3_000 }).catch(() => false))) {
    const tableLink = row.locator("td").nth(1).locator("a:visible, button:visible, span:visible").first();
    await expect(tableLink, `${sourceRef}: 任务行表名入口应可点击以打开详情抽屉`).toBeVisible({ timeout: 30_000 });
    await tableLink.click({ timeout: 30_000 });
    await waitForSpin(page, sourceRef);
    execute = page
      .locator(".ant-drawer:visible, .ant-modal:visible, body")
      .last()
      .getByRole("button", { name: /立即执行/ })
      .or(page.locator(".ant-drawer:visible button:visible, .ant-modal:visible button:visible").filter({ hasText: /立即执行/ }))
      .last();
  }
  await expect(execute, `${sourceRef}: 应展示立即执行入口`).toBeVisible({ timeout: 30_000 });
  await execute.click({ timeout: 30_000 });
  const confirm = page.locator(".ant-popover:visible, .ant-modal-confirm:visible, .ant-modal:visible").last();
  if (await confirm.isVisible({ timeout: 3_000 }).catch(() => false)) {
    const ok = confirm.getByRole("button", { name: /确\s*定|确\s*认|OK|是/ }).last();
    if (await ok.isVisible({ timeout: 3_000 }).catch(() => false)) await ok.click({ timeout: 30_000 });
  }
  await waitForSpin(page, sourceRef);
  await waitForExecuteSubmitToLeaveLoading(page, execute, sourceRef);
}

async function waitForExecuteSubmitToLeaveLoading(page: Page, execute: Locator, sourceRef: string): Promise<void> {
  const timeoutMs = Number(process.env.V6411_UI_EXECUTE_SUBMIT_WAIT_MS ?? 45_000);
  const deadline = Date.now() + timeoutMs;
  let lastClassName = "";
  while (Date.now() < deadline) {
    const className = (await execute.getAttribute("class").catch(() => "")) ?? "";
    lastClassName = className;
    if (!className.includes("ant-btn-loading")) {
      await page.waitForTimeout(2_000);
      return;
    }
    await page.waitForTimeout(1_000);
  }
  await test.info().attach(`${sourceRef}-execute-button-still-loading.png`, {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
  test.info().annotations.push({
    type: "warning",
    description: `${sourceRef}: 立即执行按钮 ${timeoutMs}ms 后仍处于 loading，继续进入结果页轮询；lastClass=${lastClassName}`,
  });
}

async function waitResultStatusFromUi(
  page: Page,
  query: string,
  expectedRuleName: string,
  sourceRef: string,
): Promise<{ classification: UiResultStatus; statusText: string; tooltipTexts: string[]; rowText: string }> {
  await page.goto("about:blank", { waitUntil: "domcontentloaded", timeout: 30_000 }).catch(() => {});
  await gotoDataQualityPage(page, "/dq/taskQuery");
  await expect(page.locator("body"), `${sourceRef}: 校验结果查询页面应打开`).toContainText("校验结果查询", {
    timeout: 30_000,
  });
  const input = page.getByPlaceholder("请输入表名/任务名称搜索").first();
  await expect(input, `${sourceRef}: 校验结果查询应展示搜索框`).toBeVisible({ timeout: 30_000 });
  const deadline = Date.now() + RESULT_TIMEOUT_MS;
  let lastRowText = "";
  let lastStatusText = "";
  let attempt = 0;
  while (Date.now() < deadline) {
    attempt += 1;
    await input.fill(query, { timeout: 30_000 });
    await page.keyboard.press("Enter").catch(() => {});
    let search = input
      .locator("xpath=ancestor::*[contains(@class, 'ant-input-search')][1]")
      .locator("button:visible")
      .filter({ has: page.locator(".anticon-search") })
      .first();
    if (!(await search.isVisible({ timeout: 2_000 }).catch(() => false))) {
      search = page.locator("button:visible").filter({ has: page.locator(".anticon-search") }).first();
    }
    if (await search.isVisible({ timeout: 2_000 }).catch(() => false)) await search.click({ timeout: 30_000 }).catch(() => {});
    await waitForSpin(page, sourceRef);
    const row = page.locator(".ant-table-tbody tr").filter({ hasText: query }).filter({ hasText: expectedRuleName }).first();
    if (await row.isVisible({ timeout: 10_000 }).catch(() => false)) {
      lastRowText = await row.innerText({ timeout: 10_000 });
      const statusCellText = await readResultStatusCellText(row);
      const tooltipTexts = await collectStatusTooltipTexts(page, row);
      lastStatusText = statusCellText;
      const classified = classifyResult(statusCellText || lastRowText, tooltipTexts);
      console.log(
        `[v6411-ui-rebuild] result-poll ${sourceRef} attempt=${attempt} classification=${classified.classification} status=${statusCellText.replace(/\s+/g, " ").slice(0, 120)} tooltip=${tooltipTexts.join(" ").slice(0, 120)} text=${lastRowText.replace(/\s+/g, " ").slice(0, 500)}`,
      );
      if (classified.classification !== "running" && classified.classification !== "unknown") {
        return { ...classified, tooltipTexts, rowText: lastRowText };
      }
    } else {
      console.log(`[v6411-ui-rebuild] result-poll ${sourceRef} attempt=${attempt} row-missing query=${query}`);
      lastRowText = `校验结果查询未出现结果行: query=${query}; expectedRuleName=${expectedRuleName}; timeoutMs=${RESULT_TIMEOUT_MS}`;
    }
    await page.waitForTimeout(Math.min(10_000, Math.max(0, deadline - Date.now())));
  }
  console.log(
    `[v6411-ui-rebuild] result-poll ${sourceRef} timeout classification=${classifyResult(lastStatusText).classification} query=${query} last=${lastRowText.replace(/\s+/g, " ").slice(0, 500)}`,
  );
  return { ...classifyResult(lastStatusText), tooltipTexts: [], rowText: lastRowText };
}

async function readResultStatusCellText(row: Locator): Promise<string> {
  const statusPattern = /校验异常|运行失败|提交失败|校验不通过|校验通过|运行中|校验中|等待|未运行|停止中/;
  const cells = row.locator("td:visible");
  for (const index of [2, 3]) {
    const cell = cells.nth(index);
    const text = ((await cell.innerText({ timeout: 1_000 }).catch(() => "")) ?? "").replace(/\s+/g, " ").trim();
    if (statusPattern.test(text)) return text;
  }
  const status = row
    .locator(".ant-badge-status-text:visible, .ant-tag:visible, .ant-typography:visible, span:visible")
    .filter({ hasText: statusPattern })
    .first();
  return ((await status.innerText({ timeout: 1_000 }).catch(() => "")) ?? "").replace(/\s+/g, " ").trim();
}

async function collectStatusTooltipTexts(page: Page, row: Locator): Promise<string[]> {
  await page.keyboard.press("Escape").catch(() => {});
  const texts: string[] = [];

  const candidateGroups = [
    row.locator("td:visible").nth(2),
    row.locator("td:visible").nth(2).locator(".anticon, svg, span"),
    row.locator(".anticon-question-circle, [aria-label='question-circle'], .ant-tag"),
    row.locator("td, span, button").filter({ hasText: /校验异常|异常|\?/ }),
  ];

  for (const candidates of candidateGroups) {
    const count = Math.min(await candidates.count().catch(() => 0), 8);
    for (let index = 0; index < count; index += 1) {
      const item = candidates.nth(index);
      if (!(await item.isVisible({ timeout: 500 }).catch(() => false))) continue;
      await item.scrollIntoViewIfNeeded({ timeout: 2_000 }).catch(() => {});
      await item.hover({ timeout: 5_000, force: true }).catch(() => {});
      await page.waitForTimeout(800);
      const tooltipTexts = await page
        .locator(".ant-tooltip:visible, [role='tooltip']:visible")
        .evaluateAll((items) => items.map((item) => (item.textContent ?? "").replace(/\s+/g, " ").trim()).filter(Boolean))
        .catch(() => []);
      texts.push(...tooltipTexts);
    }
    if (texts.some((text) => /运行失败|校验通过|校验不通过|校验未通过/.test(text))) break;
  }
  await page.keyboard.press("Escape").catch(() => {});
  return [...new Set(texts)];
}

function classifyResult(rowText: string, tooltipTexts: string[] = []): { classification: UiResultStatus; statusText: string } {
  const tooltipText = tooltipTexts.join(" ");
  if (/运行失败|提交失败/.test(rowText) || countFromTooltip(tooltipText, /运行失败/) > 0) {
    return { classification: "run-failed", statusText: "校验异常/失败" };
  }
  const unpassCount = countFromTooltip(tooltipText, /校验不通过|校验未通过/);
  const passCount = countFromTooltip(tooltipText, /校验通过/);
  if (/校验异常/.test(rowText) && (unpassCount > 0 || passCount > 0)) {
    return { classification: unpassCount > 0 ? "validation-unpass" : "validation-pass", statusText: rowText };
  }
  if (/校验不通过|校验未通过/.test(rowText)) return { classification: "validation-unpass", statusText: "校验不通过" };
  if (/校验通过/.test(rowText)) return { classification: "validation-pass", statusText: "校验通过" };
  if (/运行中|校验中|等待|未运行|停止中/.test(rowText)) return { classification: "running", statusText: "运行中/等待" };
  if (/校验异常/.test(rowText)) return { classification: "unknown", statusText: rowText };
  return { classification: "unknown", statusText: "" };
}

function countFromTooltip(text: string, label: RegExp): number {
  const match = text.match(new RegExp(`(?:${label.source})\\s*[:：]\\s*(\\d+)`));
  return match ? Number(match[1]) : 0;
}

async function waitForSpin(page: Page, sourceRef: string, timeoutMs = Number(process.env.V6411_UI_SPIN_TIMEOUT_MS ?? 60_000)): Promise<void> {
  const spin = page.locator(".ant-spin-spinning:visible");
  try {
    await expect(spin, `${sourceRef}: 页面可见加载遮罩应消失`).toHaveCount(0, {
      timeout: timeoutMs,
    });
  } catch (error) {
    await test.info().attach(`${sourceRef}-spin-timeout-diagnostic.json`, {
      body: JSON.stringify(
        {
          timeoutMs,
          url: page.url(),
          visibleSpinCount: await spin.count().catch(() => -1),
          messages: await page
            .locator(".ant-message-notice:visible, .ant-notification-notice:visible, .ant-modal:visible")
            .allInnerTexts()
            .catch((innerError) => [`<failed to read messages: ${String(innerError)}>`]),
          bodyText: ((await page.locator("body").innerText({ timeout: 3_000 }).catch(() => "")) ?? "")
            .replace(/\s+/g, " ")
            .slice(0, 3000),
        },
        null,
        2,
      ),
      contentType: "application/json",
    });
    throw error;
  }
}

async function attachScreenshot(page: Page, name: string): Promise<void> {
  await test.info().attach(`${name}.png`, {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
