import { expect, type Locator, type Page } from "@playwright/test";

import { getEnvConfig } from "../../runtime/env-profile";
import { selectAntOption } from "../../helpers/test-setup";
import { getKeyRangeTableSQL } from "../data/key-range-data";
import { addKeyRangeRule, type KeyRangeRuleConfig } from "./key-range-utils";

const ENV = getEnvConfig();

// ── TreeSelect 操作（JsonFormatConfiguration 组件）───────────

export async function selectJsonKeys(
  page: Page,
  ruleForm: Locator,
  keyNames: string[] | "全部",
): Promise<void> {
  // 定位校验内容的 TreeSelect（JsonFormatConfiguration 组件）
  // 在 key范围校验函数行中，TreeSelect 通常紧跟在校验方法 Select 之后
  const functionRow = ruleForm.locator(".rule__function-list__item").first();

  // TreeSelect 的 trigger selector：.ant-select.ant-tree-select 或 含 treeSelect 的容器
  const treeSelectTrigger = functionRow
    .locator(".ant-select.ant-tree-select, .ant-tree-select")
    .first();

  // 若 TreeSelect 不在 functionRow，退回到整个 ruleForm 中查找
  const triggerLocator = (await treeSelectTrigger.isVisible({ timeout: 2000 }).catch(() => false))
    ? treeSelectTrigger
    : ruleForm.locator(".ant-select.ant-tree-select, .ant-tree-select").first();

  // 展开 TreeSelect 下拉
  await triggerLocator.click();
  await page.waitForTimeout(500);

  const dropdown = page
    .locator(
      ".ant-tree-select-dropdown:visible, .ant-select-dropdown:visible .ant-select-tree-list",
    )
    .first();
  await dropdown.waitFor({ state: "visible", timeout: 10000 });

  if (keyNames === "全部") {
    // 全部：勾选根节点的全选 checkbox（通常是第一个 .ant-select-tree-checkbox）
    const rootCheckbox = dropdown.locator(".ant-select-tree-checkbox").first();
    if (await rootCheckbox.isVisible({ timeout: 3000 }).catch(() => false)) {
      const isChecked = await rootCheckbox.evaluate((el) =>
        el.classList.contains("ant-select-tree-checkbox-checked"),
      );
      if (!isChecked) {
        await rootCheckbox.click();
        await page.waitForTimeout(300);
      }
    }
  } else {
    for (const keyName of keyNames) {
      // 先在可见节点中查找；若树支持搜索，可先在 input 中输入
      const treeInput = dropdown.locator("input").first();
      const hasInput = await treeInput.isVisible({ timeout: 500 }).catch(() => false);

      if (hasInput) {
        await treeInput.fill(keyName);
        await page.waitForTimeout(400);
      }

      const treeNode = dropdown
        .locator(".ant-select-tree-title, .ant-select-tree-node-content-wrapper")
        .filter({ hasText: keyName })
        .first();

      if (!(await treeNode.isVisible({ timeout: 5000 }).catch(() => false))) {
        // 清空搜索，展开树节点后重试
        if (hasInput) {
          await treeInput.fill("");
          await page.waitForTimeout(300);
        }
        // 尝试展开根节点
        const expanders = dropdown.locator(".ant-select-tree-switcher").all();
        for (const expander of await expanders) {
          const isLeaf = await expander
            .evaluate((el) => el.classList.contains("ant-select-tree-switcher_close"))
            .catch(() => false);
          if (isLeaf) {
            await expander.click().catch(() => undefined);
            await page.waitForTimeout(200);
          }
        }
      }

      const nodeCheckbox = treeNode
        .locator("xpath=ancestor::*[contains(@class,'ant-select-tree-treenode')][1]")
        .locator(".ant-select-tree-checkbox")
        .first();

      if (await nodeCheckbox.isVisible({ timeout: 3000 }).catch(() => false)) {
        const isChecked = await nodeCheckbox.evaluate((el) =>
          el.classList.contains("ant-select-tree-checkbox-checked"),
        );
        if (!isChecked) {
          await nodeCheckbox.click();
          await page.waitForTimeout(200);
        }
      } else {
        // fallback：直接点击节点文字触发勾选
        await treeNode.click();
        await page.waitForTimeout(200);
      }

      // 若有搜索框，清空以便下一轮搜索
      if (hasInput) {
        await treeInput.fill("");
        await page.waitForTimeout(200);
      }
    }
  }

  // 关闭下拉（按 Escape 或点击空白处）
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
}

// ── 规则配置 ─────────────────────────────────────────────────

/**
 * 配置 key 值范围校验规则
 *
 * 操作顺序：
 *   1. 选择校验字段（单选 Select）
 *   2. 选择校验方法（包含 / 不包含）
 *   3. 选择校验内容（TreeSelect，JSON key 列表）
 *   4. 选择规则强弱（可选）
 *   5. 填写规则描述（可选）
 */
export async function configureKeyRangeRule(
  page: Page,
  ruleForm: Locator,
  config: KeyRangeRuleConfig,
): Promise<void> {
  // 1. 选择字段（key范围校验后字段变为单选）
  // 注意：必须用 /^字段/ 精确匹配，否则会命中"规则类型 = 字段级"行
  const fieldFormItem = ruleForm.locator(".ant-form-item").filter({ hasText: /^字段/ }).first();
  const fieldSelect = fieldFormItem.locator(".ant-select").first();
  await selectAntOption(page, fieldSelect, config.field);
  await page.waitForTimeout(300);

  // 2. 校验方法：包含 / 不包含（IntegrityJsonKeyVerifyType 组件）
  // 新版 UI：校验方法 select 在 ruleForm 顶层 form-item，不在 .rule__function-list__item 内
  const methodSelect = ruleForm
    .locator(".ant-form-item")
    .filter({ hasText: /校验方法/ })
    .first()
    .locator(".ant-select")
    .first();
  await selectAntOption(page, methodSelect, config.method);
  await page.waitForTimeout(300);

  // 3. 校验内容（TreeSelect）
  await selectJsonKeys(page, ruleForm, config.keyNames);

  // 4. 规则强弱（可选）
  if (config.ruleStrength) {
    const strengthFormItem = ruleForm
      .locator(".ant-form-item")
      .filter({ hasText: /强弱规则/ })
      .first();
    const strengthSelect = strengthFormItem.locator(".ant-select").first();
    await selectAntOption(page, strengthSelect, config.ruleStrength);
    await page.waitForTimeout(200);
  }

  // 5. 规则描述（可选）
  if (config.description !== undefined) {
    await ruleForm.getByPlaceholder("请填写规则描述").first().fill(config.description);
    await page.waitForTimeout(200);
  }
}

// ── 保存规则集 ───────────────────────────────────────────────

/**
 * 点击保存按钮并等待保存结果（API 响应或成功 toast）
 */
export async function saveRuleSet(page: Page): Promise<void> {
  const saveResponsePromise = page
    .waitForResponse(
      (response) => {
        const request = response.request();
        return (
          request.method() === "POST" &&
          /\/dassets\/v1\/valid\/monitorRuleSet\/(add|edit)/.test(response.url())
        );
      },
      { timeout: 15000 },
    )
    .catch(() => null);

  await page.getByRole("button", { name: /保\s*存/ }).click();

  // 部分场景保存前有确认弹窗
  const confirmSaveBtn = page
    .locator(".ant-modal-confirm:visible .ant-btn-primary, .ant-modal:visible .ant-btn-primary")
    .filter({ hasText: /保\s*存/ })
    .first();
  await confirmSaveBtn.waitFor({ state: "visible", timeout: 3000 }).catch(() => undefined);
  if (await confirmSaveBtn.isVisible().catch(() => false)) {
    await confirmSaveBtn.click();
  }

  const saveResponse = await saveResponsePromise;
  if (saveResponse) {
    const responseBody = await saveResponse.json().catch(() => null);
    const saveSucceeded =
      saveResponse.ok() &&
      (!responseBody || typeof responseBody !== "object" || responseBody.success !== false);

    if (!saveSucceeded) {
      const errorMessage =
        responseBody && typeof responseBody === "object" && "message" in responseBody
          ? String(responseBody.message)
          : `HTTP ${saveResponse.status()}`;
      throw new Error(`Save rule set failed: ${errorMessage}`);
    }

    await page.waitForTimeout(1000);
    return;
  }

  // 降级：等待成功 toast 或列表行出现
  const successToast = page
    .locator(".ant-message-notice, .ant-notification-notice, .ant-message")
    .filter({ hasText: /成功/ })
    .first();
  const listRow = page.locator(".ant-table-tbody tr:not(.ant-table-measure-row)").first();

  await Promise.any([
    successToast.waitFor({ state: "visible", timeout: 15000 }),
    listRow.waitFor({ state: "visible", timeout: 15000 }),
  ]);
  await page.waitForTimeout(1000);
}

// ── 组合函数 ─────────────────────────────────────────────────

/**
 * 在规则包中添加"完整性校验 - key范围校验"规则并完成配置
 *
 * @param page        Playwright Page
 * @param packageName 规则包名称（.ruleSetMonitor__package 中的包）
 * @param config      key 值范围校验配置
 * @returns           ruleForm Locator（已配置完成）
 */
export async function addAndConfigureKeyRangeRule(
  page: Page,
  packageName: string,
  config: KeyRangeRuleConfig,
): Promise<Locator> {
  const ruleForm = await addKeyRangeRule(page, packageName);
  await configureKeyRangeRule(page, ruleForm, config);
  return ruleForm;
}

// ── 数据准备 ─────────────────────────────────────────────────

/**
 * 通过 dtstack-cli 执行 SQL 创建表
 */
async function executeSqlViaCli(tableName: string, sql: string): Promise<void> {
  const { writeFileSync, unlinkSync } = await import("node:fs");
  const { execSync } = await import("node:child_process");

  const sqlFile = `/tmp/${tableName}.sql`;
  writeFileSync(sqlFile, sql);

  try {
    // 获取 cookie
    const cookie = process.env.LTQC_COOKIE || "";
    const cmd = `DTSTACK_COOKIE="${cookie}" ./node_modules/.bin/dtstack-cli sql exec --project ${ENV.projects.quality.name} --datasource SparkThrift --file ${sqlFile} --on-exists warn --on-missing warn --env ltqc`;
    execSync(cmd, { stdio: "pipe", timeout: 60000 });
  } finally {
    unlinkSync(sqlFile);
  }
}

/**
 * 通过 API 查询元数据是否存在
 */
async function checkMetadataExists(page: Page, tableName: string): Promise<boolean> {
  const result = await page.evaluate(
    async ({ tableName, projectId }) => {
      const response = await fetch("/dassets/v1/datamap/queryDetail", {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json;charset=UTF-8",
          "X-Valid-Project-ID": String(projectId),
        },
        body: JSON.stringify({
          current: 1,
          size: 10,
          metaType: 1,
          search: tableName,
          field: "hot",
          asc: false,
        }),
      });
      const data = await response.json();
      return (data?.data?.records ?? []).some(
        (r: { tableName?: string }) => r.tableName === tableName,
      );
    },
    { tableName, projectId: ENV.projects.quality.id },
  );
  return result;
}

/**
 * 通过 API 添加单表元数据同步任务（会在页面上产生记录）
 */
async function addMetadataSyncTask(
  page: Page,
  tableName: string,
  dataSourceId: string,
  database: string,
): Promise<void> {
  const result = await page.evaluate(
    async ({ dataSourceId, database, tableName, projectId }) => {
      const response = await fetch("/dmetadata/v1/syncTask/add", {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json;charset=UTF-8",
          "X-Valid-Project-ID": String(projectId),
        },
        body: JSON.stringify({
          dataSourceId,
          dataSourceType: 45,
          dbList: [database],
          tableList: [{ dbName: database, tableName }],
          syncFilterTermConfigDTO: { syncMetaContent: 0, pastConfiguration: 1 },
          taskType: 0,
        }),
      });
      return await response.json();
    },
    { dataSourceId, database, tableName, projectId: ENV.projects.quality.id },
  );

  if (!result?.success) {
    throw new Error(`Metadata sync task failed: ${result?.message ?? "unknown"}`);
  }

  // 等待同步完成（超时单位是 ms）
  await page.waitForTimeout(10000);
}

/**
 * 一键处理：执行 SQL + 检查元数据 + 同步元数据（如需要）
 *
 * @param page Playwright Page
 * @param tableName 唯一的表名
 * @param dataSourceId 数据源 ID（用于元数据同步）
 * @param database 数据库名
 */
export async function createTableAndSyncMetadata(
  page: Page,
  tableName: string,
  dataSourceId: string = String(ENV.datasources.sparkthrift.metadata.id),
  database: string = ENV.datasources.sparkthrift.sql.database,
): Promise<void> {
  // 1. 执行 SQL 创建表（通过 dtstack-cli）
  const sql = getKeyRangeTableSQL(tableName);
  await executeSqlViaCli(tableName, sql);

  // 2. 检查元数据是否已存在
  const exists = await checkMetadataExists(page, tableName);

  // 3. 如果不存在，添加同步任务（会在页面上产生记录）
  if (!exists) {
    await addMetadataSyncTask(page, tableName, dataSourceId, database);
  }
}
