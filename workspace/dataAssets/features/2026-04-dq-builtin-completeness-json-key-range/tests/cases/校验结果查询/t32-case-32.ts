// spec: features/2026-04-wan-zheng-xing-json-key/archive.md#case=t32-case-32
// intent: SR-INTENT-MIGRATED
// probe: SR-UI-PROBE-MIGRATED
// page: _shared/pages/PLACEHOLDER-page.ts
// META: {"id":"t32","priority":"P1","title":"验证规则库中新增key范围校验内置规则展示信息正确"}
import { expect, test } from "../../../../../_shared/fixtures/step-screenshot";
import { gotoBuiltInRuleBase, searchRuleBaseRule } from "../../../../../_shared/pages/2026-04-wan-zheng-xing-json-key/suite-helpers";

test.use({ storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc.json" });
test.setTimeout(600000);

const SUITE_NAME = "【内置规则丰富】完整性，json中key值范围校验(#15693)";

test.describe(SUITE_NAME, () => {
  test("验证校验结果查询入口可查看key范围校验内置规则展示信息", async ({ page, step }) => {
    await step("步骤1: 进入【数据质量 → 规则库配置】页面，选择内置规则 → 规则库页面正常打开", async () => {
      await gotoBuiltInRuleBase(page);
    });

    await step("步骤2: 搜索 key范围校验 → 规则行可见", async () => {
      const ruleRow = await searchRuleBaseRule(page, "key范围校验");
      await expect(ruleRow).toBeVisible({ timeout: 10000 });
    });

    await step("步骤3: 点击规则行查看详情 → 各项展示正确", async () => {
      const detailToggle = page.locator(".ant-table-row-expand-icon, .ant-table-row-expand-icon-collapsed").first();
      if (await detailToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
        await detailToggle.click();
        await page.waitForTimeout(500);
      }
      await expect(page.locator(".ant-table-row-expanded, .ant-table-expanded-row").first()).toContainText("key范围校验");
    });
  });
});
