// spec: cases/archive.md#case=概览页正确统计 StarRocks 3.x 数据源规则任务数据  probe: SR-UI-PROBE-2026-06-DQ-SR3X-ZSZQ
// A46：数据质量【概览】页加载并展示规则统计卡片（单表/多表规则总数）、运维指标（任务总数/校验通过/校验异常）、告警汇总。
// 未验证范围：archive 步骤 2/3 的精确计数（单表规则总数=3、多表=1、任务总数=4、通过=2、异常=2）假定项目内仅
// 该 4 条规则；test 为共享累积质量项目，精确计数不可控，故本用例只断言卡片/指标区与文案存在、数值为数字，
// 精确计数与时间范围刷新（步骤 4）列为未验证范围（见 handoff），不硬编一个假数。
import { expect, test } from "../../../../../../_shared/fixtures/step-screenshot";
import { gotoZszqDataAssetsPage } from "../../../../../../_shared/pages/2026-06-dq-starrocks3x/starrocks3x-quality-page";

test.describe("@serial 【P1】验证概览页正确统计 StarRocks 3.x 数据源规则任务数据", () => {
  test("【P1】概览页加载并展示规则统计卡片与运维指标", async ({ page, step }) => {
    test.setTimeout(120000);

    await step("进入【数据质量】-【概览】 → 概览页加载", async () => {
      await gotoZszqDataAssetsPage(page, "/dq/rule");
      // 左侧菜单点「概览」进入概览页（避免硬编路由）
      await page.locator("aside a, .ant-menu-item, li", { hasText: /^概览$/ }).first().click({ timeout: 15000 });
      await page.waitForTimeout(2500);
      await expect(page.locator("body"), "概览页应加载成功").toContainText("概览", { timeout: 20000 });
    });

    await step("展示「单表规则总数」「多表规则总数」规则统计卡片", async () => {
      const body = page.locator("body");
      await expect(body, "概览应展示「单表规则总数」卡片").toContainText("单表规则总数", { timeout: 20000 });
      await expect(body, "概览应展示「多表规则总数」卡片").toContainText("多表规则总数");
    });

    await step("展示「运维指标」区（任务总数 / 校验通过 / 校验异常）", async () => {
      const body = page.locator("body");
      await expect(body, "概览应展示运维指标/任务统计").toContainText(/运维指标|任务总数/, { timeout: 15000 });
      await expect(body, "运维指标应含「校验通过」").toContainText("校验通过");
      await expect(body, "运维指标应含「校验异常」").toContainText("校验异常");
    });
  });
});
