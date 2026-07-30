import { applyRuntimeCookies, buildDataAssetsUrl } from "../../../../../../../_shared/automation/runtime/env-setup";
import { selectAntOption, uniqueName, waitForUiSettled } from "../../../../../../../../../runtime/automation/playwright";
// spec: features/completeness-json-key-range/archive.md#case=t16-key
// intent: SR-INTENT-MIGRATED
// probe: SR-UI-PROBE-MIGRATED
// page: _shared/pages/PLACEHOLDER-page.ts
// META: {"id":"t16","priority":"P0","title":"【P0】验证key范围校验完整：规则集配置+导入规则包+执行任务+在校验结果查询中查看实例结果"}

import { executeTableSQL } from "dtstack-sdk/adapters/execute-table";
import { expect, test } from "../../../../../../../_shared/automation/fixtures/step-screenshot";

import {
  ACTIVE_DATASOURCES,
  clearCurrentDatasource,
  getCurrentDatasource,
  injectProjectContext,
  QUALITY_PROJECT_ID,
  QUALITY_PROJECT_NAME,
  resolveEffectiveQualityProjectId,
  setCurrentDatasource,
  TARGET_ENV,
} from "../../fixtures/test-data";
import type { MonitorDatasourceConfig } from "../../pages/rule-set-page";
import {
  addKeyRangeRule,
  configureKeyRangeRule,
  createRuleSetDraft,
  DORIS_MONITOR_DATASOURCE,
  gotoRuleSetList,
  SPARKTHRIFT_MONITOR_DATASOURCE,
  saveRuleSet,
} from "../../pages/rule-set-page";
import {
  executeTaskFromList,
  getTableRowByTaskName,
  gotoValidationResults,
} from "../../flows/rule-task-flow";

test.setTimeout(600000);

const KEY_LABELS: Record<string, string> = {
  key1: "姓名",
  key2: "年龄",
  key11: "省份",
  key22: "城市",
};

function monitorDs(): MonitorDatasourceConfig {
  return getCurrentDatasource().id === "doris3.x"
    ? DORIS_MONITOR_DATASOURCE
    : SPARKTHRIFT_MONITOR_DATASOURCE;
}

function fixedKeys(): Record<string, string> {
  return Object.fromEntries(Object.keys(KEY_LABELS).map((k) => [k, k]));
}

function tableSQL(tableName: string, isDoris: boolean, keys: Record<string, string>): string {
  const j = (v: string) => JSON.stringify(v);
  const row1 = j(
    `{${j(keys.key1).slice(1, -1)}:"张三",${j(keys.key2).slice(1, -1)}:25,${j(keys.key11).slice(1, -1)}:"广东",${j(keys.key22).slice(1, -1)}:"深圳"}`,
  );
  const row2 = j(`{${j(keys.key1).slice(1, -1)}:"李四"}`);
  const row3 = j(
    `{${j(keys.key2).slice(1, -1)}:30,${j(keys.key11).slice(1, -1)}:"北京",${j(keys.key22).slice(1, -1)}:"朝阳"}`,
  );
  if (isDoris) {
    return `DROP TABLE IF EXISTS \`${tableName}\`;\nCREATE TABLE \`${tableName}\` (id INT, info JSON) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");\nINSERT INTO \`${tableName}\` VALUES (1,${row1}),(2,${row2}),(3,${row3});`;
  }
  return `DROP TABLE IF EXISTS ${tableName};\nCREATE TABLE ${tableName} (id INT, info STRING);\nINSERT INTO ${tableName} VALUES (1,${row1}),(2,${row2}),(3,${row3});`;
}

function sel(label: RegExp) {
  return (page: import("@playwright/test").Page) =>
    page
      .locator(".ant-form-item")
      .filter({ hasText: label })
      .first()
      .locator(".ant-select")
      .first();
}

async function selectWithSearch(
  page: import("@playwright/test").Page,
  trigger: import("@playwright/test").Locator,
  text: string,
  attempts = 3,
): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    try {
      await trigger.click();
      await waitForUiSettled(page);
      await page.keyboard.type(text, { delay: 50 });
      await waitForUiSettled(page);
      const opt = page.locator(".ant-select-dropdown:visible .ant-select-item-option").first();
      await opt.click({ timeout: 5000 });
      await waitForUiSettled(page);
      return;
    } catch (e) {
      await page.keyboard.press("Escape").catch(() => undefined);
      await waitForUiSettled(page);
      if (i === attempts - 1) throw e;
    }
  }
}

for (const datasource of ACTIVE_DATASOURCES) {
  test.describe(`t16 - ${datasource.reportName}`, () => {
    test.beforeAll(() => setCurrentDatasource(datasource));
    test.beforeEach(() => setCurrentDatasource(datasource));
    test.afterAll(() => clearCurrentDatasource());

    test("key范围校验完整流程", async ({ page, step }) => {
      const tableName = uniqueName("t16key_range_tbl");
      const packageName = uniqueName("t16key_range_pkg");
      const taskName = uniqueName("t16key_range_tsk");
      const uniqueKeys = fixedKeys();

      // 步骤1: 打开页面 + 创建表
      await step("创建测表", async () => {
        await gotoRuleSetList(page);
        await expect(page.locator(".ant-table-tbody, .ant-empty").first()).toBeVisible({
          timeout: 15000,
        });
        const ds = getCurrentDatasource();
        await executeTableSQL(page, {
          sql: tableSQL(tableName, ds.id === "doris3.x", uniqueKeys),
          tableName,
          datasource: ds.preconditionType as "SparkThrift" | "Doris",
          project: QUALITY_PROJECT_NAME(),
          env: TARGET_ENV(),
          database: ds.database,
          projectId: QUALITY_PROJECT_ID(),
          dataSourceId: String(ds.metadataDataSourceId),
          dataSourceType: ds.metadataDataSourceType,
        });
      });

      // 步骤2: 建规则集 + 配置规则
      await step("建规则集并配置key范围校验", async () => {
        await createRuleSetDraft(page, tableName, [packageName], monitorDs());
        const ruleForm = await addKeyRangeRule(page, packageName);
        await configureKeyRangeRule(page, ruleForm, {
          field: "info",
          method: "包含",
          keyNames: [uniqueKeys.key1, uniqueKeys.key2],
          ruleStrength: "强规则",
          description: taskName,
        });
        await saveRuleSet(page);
      });

      // 步骤3: 建监控任务（用 UI 完整流程）
      await step("创建监控任务", async () => {
        const ds = getCurrentDatasource();
        const effectiveProjectId = await resolveEffectiveQualityProjectId(page);
        const url = buildDataAssetsUrl("/dq/rule/add", effectiveProjectId);
        await applyRuntimeCookies(page);
        await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
        await injectProjectContext(page, effectiveProjectId);
        await page.reload({ waitUntil: "networkidle", timeout: 30000 });
        await waitForUiSettled(page);

        // 等表单加载
        await expect(
          page
            .locator(".ant-form-item")
            .filter({ hasText: /^规则名称/ })
            .first(),
        ).toBeVisible({ timeout: 15000 });

        // 填基础信息（下拉框用搜索选择）
        await page
          .locator(".ant-form-item")
          .filter({ hasText: /^规则名称/ })
          .locator("input")
          .first()
          .fill(taskName);
        const mDs = monitorDs();
        await selectWithSearch(page, sel(/选择数据源/)(page), mDs.keyword.source);
        await waitForUiSettled(page);
        await selectWithSearch(page, sel(/选择数据库/)(page), ds.database);
        await waitForUiSettled(page);
        await selectWithSearch(page, sel(/选择数据表/)(page), tableName);
        await waitForUiSettled(page);

        // 下一步 → Step 2
        await page.getByRole("button", { name: "下一步" }).first().click();
        await waitForUiSettled(page);

        // 导入规则包
        await selectAntOption(page, sel(/规则包/)(page), packageName);
        await waitForUiSettled(page);
        await selectAntOption(page, sel(/规则类型/)(page), /完整性校验|完整性/);
        await waitForUiSettled(page);
        await page.getByRole("button", { name: /引入/ }).click();
        await waitForUiSettled(page);
        await expect(page.locator(".ruleForm").first()).toBeVisible({ timeout: 10000 });

        // 下一步 → Step 3（调度属性）
        await page.getByRole("button", { name: "下一步" }).last().click();
        await waitForUiSettled(page);
        await waitForUiSettled(page);

        // 资源组（必填）
        const rgSelect = page
          .locator(".ant-form-item")
          .filter({ hasText: /资源组/ })
          .locator(".ant-select")
          .first();
        if (await rgSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
          await selectAntOption(page, rgSelect, /default|Default/);
          await waitForUiSettled(page);
        }

        // 规则拼接包
        const pkgCnt = page
          .locator(".ant-form-item")
          .filter({ hasText: /规则拼接包/ })
          .locator("input")
          .first();
        if (await pkgCnt.isVisible({ timeout: 2000 }).catch(() => false)) await pkgCnt.fill("1");

        // 立即生成
        const immRadio = page
          .locator(".ant-radio-wrapper, .ant-radio-button-wrapper")
          .filter({ hasText: /立即生成/ })
          .first();
        if (await immRadio.isVisible({ timeout: 2000 }).catch(() => false)) {
          await immRadio.click();
          await waitForUiSettled(page);
        }

        // 报告名称
        const rptInput = page
          .locator(".ant-form-item")
          .filter({ hasText: /报告名称/ })
          .locator("input")
          .first();
        if (await rptInput.isVisible({ timeout: 2000 }).catch(() => false))
          await rptInput.fill(`${taskName}_rpt`);

        // 数据日期/数据周期
        const dcInputs = page
          .locator(".ant-form-item")
          .filter({ hasText: /数据日期|数据周期/ })
          .locator("input");
        if (
          await dcInputs
            .first()
            .isVisible({ timeout: 2000 })
            .catch(() => false)
        ) {
          await dcInputs.nth(0).fill("1");
          if ((await dcInputs.count()) > 1) await dcInputs.nth(1).fill("0");
        }

        // 是否需要车辆信息 → 否
        const carRadio = page
          .locator(".ant-form-item")
          .filter({ hasText: /是否需要车辆信息/ })
          .locator(".ant-radio-wrapper, .ant-radio-button-wrapper")
          .filter({ hasText: /^否$/ })
          .first();
        if (await carRadio.isVisible({ timeout: 2000 }).catch(() => false)) {
          await carRadio.click();
          await waitForUiSettled(page);
        }

        // 保存并等待
        const saveRespPromise = page
          .waitForResponse(
            (r) =>
              r.url().includes("/dassets/v1/valid/monitor/add") ||
              r.url().includes("/dassets/v1/valid/monitor/edit"),
          )
          .catch(() => null);
        await page
          .getByRole("button", { name: /新建|保存/ })
          .last()
          .click();
        await waitForUiSettled(page);

        // 确认弹窗
        const confirmModal = page.locator(".ant-modal:visible, .ant-modal-confirm:visible").last();
        if (await confirmModal.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmModal
            .getByRole("button", { name: /确认|确定/ })
            .first()
            .click();
        }

        const saveResp = await saveRespPromise;
        if (!saveResp) {
          const errs = await page
            .locator(".ant-form-item-explain-error:visible")
            .allTextContents()
            .catch(() => [] as string[]);
          throw new Error(`Task save request not triggered. Errors: ${errs.join(" | ") || "none"}`);
        }
        const saveResult = await saveResp.json().catch(() => null);
        if (!saveResult?.success)
          throw new Error(`Task save failed: ${saveResult?.message ?? "unknown"}`);
        await page.goto(buildDataAssetsUrl("/dq/rule", effectiveProjectId), {
          waitUntil: "networkidle",
          timeout: 30000,
        });
        await waitForUiSettled(page);
      });

      // 步骤4: 执行 + 轮询等待完成
      await step("执行任务并等待", async () => {
        await executeTaskFromList(page, taskName);
        // 导航到校验结果页并轮询
        await applyRuntimeCookies(page);
        const effectiveProjectId = await resolveEffectiveQualityProjectId(page);
        await page.goto(buildDataAssetsUrl("/dq/taskQuery", effectiveProjectId), {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });
        const deadline = Date.now() + 600000;
        while (Date.now() < deadline) {
          await page
            .reload({ waitUntil: "networkidle", timeout: 30000 })
            .catch(() => page.reload().catch(() => {}));
          await waitForUiSettled(page);
          const row = getTableRowByTaskName(page, taskName);
          if (await row.isVisible({ timeout: 3000 }).catch(() => false)) {
            const text = await row.innerText().catch(() => "");
            if (
              !/运行中|执行中|排队|等待/.test(text) &&
              /校验通过|未通过|不通过|异常|失败/.test(text)
            )
              return;
          }
        }
        throw new Error(`Task ${taskName} did not finish within 600s`);
      });

      // 步骤5: 校验结果
      await step("校验结果查询", async () => {
        await gotoValidationResults(page);
        const row = getTableRowByTaskName(page, taskName);
        await expect(row).toBeVisible({ timeout: 30000 });
        // 实例状态为"校验异常"
        await expect(row).toContainText(/校验异常|异常/, { timeout: 30000 });

        // 点击最后列（操作）的按钮打开详情弹窗
        const actionBtn = row.locator("td").last().getByRole("button").first();
        await expect(actionBtn).toBeVisible({ timeout: 5000 });
        await actionBtn.click();
        await waitForUiSettled(page);

        const drawer = page.locator(".ant-drawer:visible, .dtc-drawer:visible").last();
        await expect(drawer).toBeVisible({ timeout: 10000 });
        await expect(drawer).toContainText(/校验未通过|校验不通过/, { timeout: 5000 });

        // 点击查看明细
        const detailBtn = drawer.getByRole("button", { name: /查看明细|明细/ }).first();
        if (await detailBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await detailBtn.click();
          await waitForUiSettled(page);
        }
      });
    });
  });
}
