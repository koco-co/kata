// spec: features/v7.0.0/2026-06-dq-json-export-checkbox/cases/archive.md#case=smoke
// intent: SR-INTENT-V700-16019-JSON-EXPORT
// probe: SR-UI-PROBE-20260706-V700-16019-LTQC-SY
// page: _shared/pages/2099-01-lt-dq-main-flow/data-quality-page.ts
// generated_at: 2026-07-06T04:10:21Z
import { expect, test } from "../../../../../../_shared/fixtures/step-screenshot";
import { gotoDataQualityPage } from "../../../../../../_shared/pages/2099-01-lt-dq-main-flow/data-quality-page";

test.describe("v700 16019 json格式校验勾选导出 smoke @serial", () => {
  test("json格式校验管理页面可达并展示导出入口", async ({ page, step }) => {
    await step("步骤1: 打开 json格式校验管理页面 → 页面展示列表和导出入口", async () => {
      await gotoDataQualityPage(page, "/dq/generalConfig/jsonValidationConfig");
      await closeGuideIfPresent(page);
      await expect(page.locator("body")).toContainText("json格式校验管理", { timeout: 30000 });
      await expect(page.locator(".ant-table-thead")).toContainText("key", { timeout: 30000 });
      await expect(page.locator(".ant-table-thead")).toContainText("中文名称", { timeout: 30000 });
      await expect(page.locator("button").filter({ hasText: /导\s*出/ }).first()).toBeVisible({
        timeout: 30000,
      });
    });
  });
});

async function closeGuideIfPresent(page: import("@playwright/test").Page): Promise<void> {
  const guideButton = page.getByText("知道了", { exact: true }).last();
  if (await guideButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await guideButton.click({ timeout: 10000 });
    await guideButton.waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
  }
}
