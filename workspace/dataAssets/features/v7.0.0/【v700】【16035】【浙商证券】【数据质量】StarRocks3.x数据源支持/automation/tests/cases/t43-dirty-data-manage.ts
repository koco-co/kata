// spec: cases/archive.md#case=脏数据管理  probe: SR-UI-PROBE-2026-06-DQ-SR3X-ZSZQ
// 脏数据管理：页面加载（列含 数据源/脏数据存储库/数据存储时效/...）+ 按数据源名搜索过滤到 STAR_ROCKS_3X。
// 注：独立存储配置保存(改环境状态)与任务查询脏数据明细写入校验为未验证范围，见 handoff。
import { expect, test } from "../../../../../../_shared/fixtures/step-screenshot";
import { gotoZszqDataAssetsPage } from "../../../../../../_shared/pages/2026-06-dq-starrocks3x/starrocks3x-quality-page";

test.setTimeout(120000);

test.describe("@serial StarRocks3.x 脏数据管理配置查看", () => {
  test("【P1】脏数据管理页加载并按数据源筛选 StarRocks3.x", async ({ page, step }) => {
    await step("进入脏数据管理 → 页面加载，列含 数据源/脏数据存储库/数据存储时效", async () => {
      await gotoZszqDataAssetsPage(page, "/dq/project/dirtyDataManage");
      await page.locator(".ant-table-tbody tr.ant-table-row").first().waitFor({ state: "visible", timeout: 20000 });
      const head = page.locator(".ant-table-thead");
      await expect(head, "应有「数据源」列").toContainText("数据源");
      await expect(head, "应有「脏数据存储库」列").toContainText("脏数据存储库");
      await expect(head, "应有「数据存储时效」列").toContainText(/数据存储时效|存储时效/);
    });

    await step("按数据源名搜索 → 列表过滤到 StarRocks3.x 行", async () => {
      const search = page.locator("input[placeholder*='数据源']").first();
      await expect(search, "应有数据源名称搜索框").toBeVisible({ timeout: 10000 });
      await search.fill("pw_sr3");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(2000);
      const rows = page.locator(".ant-table-tbody tr.ant-table-row");
      const n = await rows.count();
      expect(n, "搜索后应有匹配行").toBeGreaterThan(0);
      // 逐行断言「仅展示 StarRocks3.x 数据源」：只验首行无法发现过滤泄漏（混入其它数据源行）。
      for (let i = 0; i < n; i++) {
        await expect(rows.nth(i), `第 ${i + 1} 行应为 StarRocks3.x 数据源`).toContainText(/STAR_ROCKS|pw_sr3/i);
      }
    });
  });
});
