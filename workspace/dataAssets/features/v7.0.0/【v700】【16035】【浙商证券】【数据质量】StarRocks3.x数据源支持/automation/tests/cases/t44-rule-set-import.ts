// spec: cases/archive.md#case=规则集导入规则包  probe: SR-UI-PROBE-2026-06-DQ-SR3X-ZSZQ
// 规则集导入：新建规则集→基础信息→规则内容(导入「证券基础校验包.xls」含完整性+唯一性 2 规则)→调度手动触发→保存
// →在「规则集」区对该规则集「立即执行」→校验异常。
// zszq_ruleset 含 1 条 security_name 空值 + 1 组 security_code 重复 → 立即执行校验异常。
// 导入走 UI：本 build 规则包导入仅接受 .xls(老 BIFF 格式)，故用提交的 .xls fixture（exceljs 只能写 .xlsx 会被拒）。
// 规则集是独立实体(ruleCollection)：保存后按 collectionName 回查 collectionId，执行走 executeRuleCheck，
// 执行后才物化出 zszq_ruleset 的 monitor + 实例（源码 customltem/dt-insight-studio api/ruleConfig.ts）。
import { fileURLToPath } from "node:url";
import { expect, test } from "../../../../../../_shared/fixtures/step-screenshot";
import {
  cleanupRulesByTable,
  expectInstanceStatus,
  pollLatestInstance,
} from "../../../../../../_shared/pages/2026-06-dq-starrocks3x/starrocks3x-rule-flow";
import {
  gotoZszqDataAssetsPage,
  postDataAssetsApi,
} from "../../../../../../_shared/pages/2026-06-dq-starrocks3x/starrocks3x-quality-page";
import { locateFormItem, selectAntOption } from "../../../../../../_shared/helpers/index";

const TABLE = "zszq_ruleset";
const PROJECT_ID = 1000003;
// 规则包导入文件（用户提供的真实平台模板 .xls，含 zszq_ruleset 的完整性+唯一性 2 规则）。
const RULESET_XLS = fileURLToPath(new URL("./fixtures/zszq-ruleset-collection.xls", import.meta.url));

type CollectionRow = { collectionId?: unknown; id?: unknown; collectionName?: unknown; name?: unknown };

/** 按 collectionName 回查规则集 collectionId（规则集列表 pageRuleCollection）。 */
async function findCollectionId(page: import("@playwright/test").Page, name: string): Promise<string> {
  const resp = (await postDataAssetsApi(page, "/dassets/v1/valid/dataQuality/pageRuleCollection", {
    currentPage: 1,
    pageSize: 100,
    projectId: PROJECT_ID,
  }).catch(() => ({ data: [] }))) as { data?: { data?: CollectionRow[] } | CollectionRow[] };
  const list = (Array.isArray(resp?.data) ? resp.data : (resp?.data?.data ?? [])) as CollectionRow[];
  const hit = list.find((c) => String(c.collectionName ?? c.name ?? "") === name);
  return hit ? String(hit.collectionId ?? hit.id) : "";
}

/** 删除指定名称的规则集（清理）。 */
async function deleteRuleCollection(page: import("@playwright/test").Page, name: string): Promise<void> {
  const id = await findCollectionId(page, name);
  if (id) {
    await postDataAssetsApi(page, "/dassets/v1/valid/dataQuality/deleteRuleCollection", { collectionId: id }).catch(
      () => undefined,
    );
  }
}

type RecordRow = { monitorId?: unknown; id?: unknown; tableName?: unknown };

/**
 * 回查规则集执行实例的 monitorId：规则集「立即执行」后，monitorRecord 产生一条 tableName=规则集名 的实例
 * （非按 zszq_ruleset 物化、也非独立 monitor），其 monitorId 即规则集执行 monitor。重试等待落库。
 */
async function findRulesetMonitorId(page: import("@playwright/test").Page, rulesetName: string): Promise<string> {
  for (let i = 0; i < 12; i++) {
    const rec = (await postDataAssetsApi(page, "/dassets/v1/valid/monitorRecord/pageQuery", {
      currentPage: 1,
      pageSize: 100,
      projectId: PROJECT_ID,
    }).catch(() => ({ data: { data: [] } }))) as { data?: { data?: RecordRow[] } };
    const mine = (rec?.data?.data ?? [])
      .filter((r) => String(r.tableName ?? "") === rulesetName)
      .sort((a, b) => Number(b.id ?? 0) - Number(a.id ?? 0))[0];
    if (mine) return String(mine.monitorId ?? mine.id);
    await page.waitForTimeout(2500);
  }
  return "";
}

test.describe("@serial StarRocks3.x 规则集导入规则包批量校验", () => {
  // 多步向导 + 导入 + 执行耗时长，统一给本组测试及其 beforeEach/afterEach 钩子充足预算。
  test.describe.configure({ timeout: 300000 });
  let createdRuleset = "";
  test.beforeEach(async ({ page }) => {
    await cleanupRulesByTable(page, TABLE);
  });
  test.afterEach(async ({ page }) => {
    if (createdRuleset) await deleteRuleCollection(page, createdRuleset);
    await cleanupRulesByTable(page, TABLE);
  });

  test("【P0】导入规则包(完整性+唯一性)后立即执行校验异常", async ({ page, step }) => {
    test.setTimeout(300000);
    const rulesetName = `证券基础校验集_${Date.now()}`;

    await step("新建规则集 ① 基础信息（名称/校验数据源/描述）", async () => {
      await gotoZszqDataAssetsPage(page, "/dq/rule/createRuleGroup");
      await page.waitForTimeout(2000);
      await locateFormItem(page, "规则集名称").locator("input").first().fill(rulesetName);
      await selectAntOption(page, locateFormItem(page, "校验数据源").locator(".ant-select").first(), "STAR_ROCKS_3X");
      await page.waitForTimeout(500);
      await locateFormItem(page, "规则集描述").locator("input, textarea").first().fill("证券基础完整性与唯一性校验").catch(() => {});
      await page.locator("button:visible", { hasText: /^下一步$/ }).first().click();
      await page.waitForTimeout(2000);
    });

    await step("② 规则内容：导入规则包 .xls（完整性+唯一性 2 规则）", async () => {
      // 「导入规则」开上传弹窗（antd Upload 隐藏 input[type=file]），setInputFiles 直接喂 .xls
      await page.locator("button:visible", { hasText: "导入规则" }).first().click();
      await page.waitForTimeout(1200);
      await page.locator("input[type='file']").first().setInputFiles(RULESET_XLS);
      await page.waitForTimeout(2000);
      // 弹窗点「确 定」上传确认（不要误点含「上传」字样的上传触发按钮）
      await page
        .locator("[role='dialog']:visible button, .ant-modal:visible button", { hasText: /确\s*定/ })
        .first()
        .click();
      // 导入成功的正向信号：出现「文件上传成功！」提示（.xls 被接受并解析）
      await expect(
        page.locator(".ant-message, .ant-message-notice").filter({ hasText: "文件上传成功" }).first(),
        "导入 .xls 应提示文件上传成功",
      ).toBeVisible({ timeout: 15000 });
      // 解析完成后「下一步」由 disabled 转可用
      const next = page.locator("button:visible", { hasText: /^下一步$/ }).first();
      await expect(next, "导入规则包成功后下一步应可用").toBeEnabled({ timeout: 15000 });
      await next.click();
      await page.waitForTimeout(2000);
    });

    await step("③ 调度配置 手动触发 → 保存", async () => {
      await selectAntOption(page, locateFormItem(page, "调度周期").locator(".ant-select").first(), "手动触发").catch(() => {});
      await page.waitForTimeout(500);
      await page.locator("button:visible", { hasText: /保\s*存|完\s*成|新\s*建|确\s*定/ }).first().click();
      await expect(page, "保存后应回到规则配置").toHaveURL(/#\/dq\/rule(\?|$)/, { timeout: 20000 });
      createdRuleset = rulesetName;
    });

    await step("对规则集「立即执行」→ 校验异常（空值 + 重复明细）", async () => {
      const collectionId = await findCollectionId(page, rulesetName);
      expect(Number(collectionId), "应回查到规则集 collectionId").toBeGreaterThan(0);
      const exec = (await postDataAssetsApi(page, "/dassets/v1/valid/dataQuality/executeRuleCheck", {
        collectionId,
      })) as { success?: boolean; message?: string } | undefined;
      expect(exec?.success !== false, `执行规则集应成功：${JSON.stringify(exec)}`).toBe(true);
      // 执行后在 monitorRecord 产生一条 tableName=规则集名 的执行实例，回查其 monitorId 后轮询至终态
      const monitorId = await findRulesetMonitorId(page, rulesetName);
      expect(Number(monitorId), "执行后应在任务记录产生规则集执行实例").toBeGreaterThan(0);
      expectInstanceStatus(await pollLatestInstance(page, monitorId), "校验异常");
    });
  });
});
