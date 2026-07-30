import { waitForUiSettled } from "../../../../../../../../runtime/automation/playwright";
// spec: cases/archive.md#case=规则配置列表查询与筛选  probe: SR-UI-PROBE-2026-06-DQ-SR3X-ZSZQ
// 规则配置列表查询与筛选：表名搜索 → 最近修改人筛选 → 我收藏的表 → 分页。前置依赖 KEEP_RULES 已建多条规则。
// 真实 DOM（live probe）：分页 .ant-pagination-total-text=「共N条数据」；最近修改人为 placeholder「选择最近修改人」
// 的 ant-select；行操作列已收藏显示「取消收藏」、未收藏显示「收藏」。
import { expect, test } from "../../../../../../_shared/automation/fixtures/step-screenshot";
import { gotoZszqDataAssetsPage } from "../pages/data-quality-page";

test.describe("@serial 【P2】验证 StarRocks 3.x 数据源规则配置列表查询与筛选", () => {
  test("【P2】表名搜索 / 最近修改人 / 我收藏的表 / 分页", async ({ page, step }) => {
    test.setTimeout(180000);

    await step("表名搜索 zszq_trade_repeat → 列表逐行匹配", async () => {
      await gotoZszqDataAssetsPage(page, "/dq/rule");
      await page.locator(".ant-table-tbody tr.ant-table-row").first().waitFor({ state: "visible", timeout: 20000 });
      const search = page.locator("input[placeholder*='输入表名'], input[placeholder*='表名搜索']").first();
      await search.fill("zszq_trade_repeat");
      await page.keyboard.press("Enter");
      await waitForUiSettled(page);
      const rows = page.locator(".ant-table-tbody tr.ant-table-row");
      const n = await rows.count();
      expect(n, "搜索后应有匹配行").toBeGreaterThan(0);
      for (let i = 0; i < n; i++) {
        await expect(rows.nth(i), `第 ${i + 1} 行表名应匹配搜索词`).toContainText("zszq_trade_repeat");
      }
    });

    await step("最近修改人筛选 → 列表逐行匹配所选修改人", async () => {
      await gotoZszqDataAssetsPage(page, "/dq/rule");
      await page.locator(".ant-table-tbody tr.ant-table-row").first().waitFor({ state: "visible", timeout: 20000 });
      const modSelect = page.locator(".ant-select").filter({ hasText: "选择最近修改人" }).first();
      await expect(modSelect, "应有「最近修改人」筛选下拉").toBeVisible({ timeout: 10000 });
      await modSelect.click();
      await waitForUiSettled(page);
      // 取第一个真实修改人选项（跳过「全部/所有」之类聚合项）
      const opts = page.locator(".ant-select-dropdown:visible .ant-select-item-option");
      await expect(opts.first(), "最近修改人下拉应有可选项").toBeVisible({ timeout: 8000 });
      const optCount = await opts.count();
      let modName = "";
      let picked = opts.first();
      for (let i = 0; i < optCount; i++) {
        const t = ((await opts.nth(i).textContent()) || "").trim();
        if (t && !/全部|所有|all/i.test(t)) {
          modName = t;
          picked = opts.nth(i);
          break;
        }
      }
      expect(modName.length, "应取到一个真实修改人名").toBeGreaterThan(0);
      await picked.click();
      await waitForUiSettled(page);
      const rows = page.locator(".ant-table-tbody tr.ant-table-row");
      const n = await rows.count();
      expect(n, `选定修改人「${modName}」后应有匹配行`).toBeGreaterThan(0);
      for (let i = 0; i < n; i++) {
        await expect(rows.nth(i), `第 ${i + 1} 行应含修改人「${modName}」`).toContainText(modName);
      }
    });

    await step("勾选「我收藏的表」→ 列表仅展示已收藏表（每行均「取消收藏」）", async () => {
      await gotoZszqDataAssetsPage(page, "/dq/rule");
      await page.locator(".ant-table-tbody tr.ant-table-row").first().waitFor({ state: "visible", timeout: 20000 });
      const before = await page.locator(".ant-table-tbody tr.ant-table-row").count();
      const fav = page.locator(".ant-checkbox-wrapper", { hasText: "我收藏的表" }).first();
      await expect(fav, "应有「我收藏的表」筛选").toBeVisible({ timeout: 10000 });
      await fav.click();
      await waitForUiSettled(page);
      const tbody = page.locator(".ant-table-tbody");
      const fn = await tbody.locator("tr.ant-table-row").count();
      expect(fn, "应有已收藏的表（前置已收藏 zszq_trade_orders）").toBeGreaterThan(0);
      // 仅展示已收藏：已收藏行操作列为「取消收藏」，未收藏行才是「收藏」；过滤后不应出现任何「收藏」按钮。
      expect(
        await tbody.getByRole("button", { name: "收藏", exact: true }).count(),
        "收藏过滤后不应出现未收藏行（精确「收藏」按钮）",
      ).toBe(0);
      expect(
        await tbody.getByRole("button", { name: "取消收藏", exact: true }).count(),
        "过滤后每行均应为已收藏（「取消收藏」）",
      ).toBe(fn);
      // 取消筛选恢复
      await fav.click();
      await waitForUiSettled(page);
      expect(
        await page.locator(".ant-table-tbody tr.ant-table-row").count(),
        "取消收藏筛选后列表应恢复",
      ).toBe(before);
    });

    await step("分页：展示总条数「共 N 条」并可翻页", async () => {
      await gotoZszqDataAssetsPage(page, "/dq/rule");
      await page.locator(".ant-table-tbody tr.ant-table-row").first().waitFor({ state: "visible", timeout: 20000 });
      const totalText = page.locator(".ant-pagination-total-text").first();
      await expect(totalText, "分页应展示总条数「共 N 条」").toContainText(/共\s*\d+\s*条/, { timeout: 10000 });
      const total = Number(((await totalText.textContent()) || "").match(/(\d+)/)?.[1] ?? "0");
      const next = page.locator(".ant-pagination-next").first();
      if (total > 20 && (await next.getAttribute("aria-disabled")) !== "true") {
        await next.click();
        await waitForUiSettled(page);
        await expect(page.locator(".ant-pagination-item-active"), "翻页后当前页应为第 2 页").toHaveText("2");
      } else {
        expect(total, "总条数不足一页时记录实际值（无需翻页）").toBeGreaterThan(0);
      }
    });
  });
});
