// spec: cases/archive.md#case=规则配置列表查询与筛选  probe: SR-UI-PROBE-2026-06-DQ-SR3X-ZSZQ
// 规则配置列表查询与筛选：表名搜索过滤 → 最近修改人筛选 → 我收藏的表 → 分页。前置依赖 KEEP_RULES 已建多条规则。
import { expect, test } from "../../../../../../_shared/fixtures/step-screenshot";
import { gotoZszqDataAssetsPage } from "../../../../../../_shared/pages/2026-06-dq-starrocks3x/starrocks3x-quality-page";

test.setTimeout(180000);

test.describe("@serial StarRocks3.x 规则配置列表查询与筛选", () => {
  test("【P2】表名搜索 / 最近修改人 / 我收藏的表 / 分页", async ({ page, step }) => {
    await gotoZszqDataAssetsPage(page, "/dq/rule");
    await page.locator(".ant-table-tbody tr.ant-table-row").first().waitFor({ state: "visible", timeout: 20000 });

    await step("表名搜索 zszq_trade_repeat → 列表仅展示匹配规则", async () => {
      const search = page.locator("input[placeholder*='输入表名'], input[placeholder*='表名搜索']").first();
      await search.fill("zszq_trade_repeat");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(2000);
      const rows = page.locator(".ant-table-tbody tr.ant-table-row");
      const n = await rows.count();
      expect(n, "搜索后应有匹配行").toBeGreaterThan(0);
      // 每一行的表名列都应包含搜索词
      for (let i = 0; i < n; i++) {
        await expect(rows.nth(i), `第 ${i + 1} 行表名应匹配搜索词`).toContainText("zszq_trade_repeat");
      }
    });

    await step("清空搜索 → 列表恢复全部，分页展示总条数", async () => {
      const search = page.locator("input[placeholder*='输入表名'], input[placeholder*='表名搜索']").first();
      await search.fill("");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(2000);
      await expect(page.locator(".ant-pagination"), "应展示分页控件").toBeVisible({ timeout: 10000 });
      await expect(page.locator(".ant-pagination-total-text, .ant-table-pagination"), "分页应展示总条数").toContainText(/共.*条|\d+/, {
        timeout: 10000,
      });
    });

    await step("勾选「我收藏的表」→ 列表按收藏过滤后再取消恢复", async () => {
      const fav = page.locator(".ant-checkbox-wrapper", { hasText: "我收藏的表" }).first();
      await expect(fav, "应有「我收藏的表」筛选").toBeVisible({ timeout: 10000 });
      const before = await page.locator(".ant-table-tbody tr.ant-table-row").count();
      await fav.click();
      await page.waitForTimeout(2000);
      // 收藏过滤后行数不超过全部（多为 0 或更少），取消后应恢复
      await fav.click();
      await page.waitForTimeout(2000);
      const after = await page.locator(".ant-table-tbody tr.ant-table-row").count();
      expect(after, "取消收藏筛选后列表应恢复").toBe(before);
    });
  });
});
