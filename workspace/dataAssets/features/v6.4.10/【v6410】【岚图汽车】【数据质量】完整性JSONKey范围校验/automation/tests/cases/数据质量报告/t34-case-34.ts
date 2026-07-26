// spec: features/completeness-json-key-range/archive.md#case=t34-case-34
// intent: SR-INTENT-MIGRATED
// probe: SR-UI-PROBE-MIGRATED
// page: _shared/pages/PLACEHOLDER-page.ts
// META: {"id":"t34","priority":"P0","title":"验证质量报告中校验通过行的各列展示内容正确"}
import { expect, test } from "../../../../../../../_shared/fixtures/step-screenshot";
import {
  ensureQualityReportsReady,
  gotoQualityReport,
  MAIN_TASK_NAME,
  openQualityReportDetail,
} from "../../../../../../../_shared/pages/completeness-json-key-range/task-helpers";

test.setTimeout(600000);

const SUITE_NAME = "【内置规则丰富】完整性，json中key值范围校验(#15693)";

test.describe(SUITE_NAME, () => {
  test("验证质量报告中校验通过行的各列展示内容正确", async ({ page, step }) => {
    let qualityReportPage!: import("@playwright/test").Locator;
    let passRow!: import("@playwright/test").Locator;

    await step(
      "步骤1: 进入【数据质量 → 数据质量报告】页面，等待页面加载完成 → 数据质量报告页面正常打开，报告列表加载完成",
      async () => {
        await ensureQualityReportsReady(page, [MAIN_TASK_NAME]);
        await gotoQualityReport(page);
        await expect(
          page.locator(".ant-table-tbody").first(),
        ).toBeVisible({ timeout: 15000 });
      },
    );

    await step(
      "步骤2: 找到\"task_json_key_range_test\"，查看最新一次执行的报告详情 → 报告详情页正常打开，数据加载完成",
      async () => {
        qualityReportPage = await openQualityReportDetail(page, MAIN_TASK_NAME);
        await expect(qualityReportPage).toBeVisible({ timeout: 15000 });
      },
      qualityReportPage,
    );

    await step(
      "步骤3: 找到质检结果为\"校验通过\"的规则行，逐列查看各字段值 → 该规则行各列展示正确：1) 规则类型列=完整性校验 2) 规则名称列=key范围校验 3) 字段类型列=json 4) 质检结果=校验通过 5) 未通过原因列=-- 6) 详情说明列=符合规则key范围包含\"key1-key2\" 7) 操作列=--",
      async () => {
        const allRows = qualityReportPage.locator(
          ".ant-table-tbody tr:not(.ant-table-measure-row)",
        );
        await expect(allRows.first()).toBeVisible({ timeout: 15000 });

        passRow = allRows.filter({ hasText: "校验通过" }).first();
        await expect(passRow).toBeVisible({ timeout: 10000 });

        await expect(passRow).toContainText("完整性校验");
        await expect(passRow).toContainText("key范围校验");
        await expect(passRow).toContainText("json");
        await expect(passRow).toContainText("校验通过");
        await expect(passRow).toContainText("--");
        await expect(passRow).toContainText('符合规则key范围包含"key1-key2"');
      },
      passRow,
    );
  });
});
