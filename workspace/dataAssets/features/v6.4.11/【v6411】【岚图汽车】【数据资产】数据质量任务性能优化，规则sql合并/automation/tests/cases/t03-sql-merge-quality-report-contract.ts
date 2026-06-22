// spec: cases/archive.md#L5273-L5368
// intent: SR-INTENT-V6411-SQL-MERGE
// probe: runs/preflight-01/playwright/ui-probe/ui-probe-retry-2-result.json
// SourceRefs: SR-ARCHIVE-V6411-SQL-MERGE-L5296, SR-UI-PROBE-V6411-SQL-MERGE-02
import { expect, test } from "@playwright/test";

import {
  expectGeneratedReportShape,
  gotoDqSqlMergeRoute,
  queryGeneratedReports,
} from "../data/sql-merge-contract";

test.use({
  storageState:
    process.env.UI_AUTOTEST_SESSION_PATH ??
    "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
});
test.setTimeout(3 * 60 * 1000);

test("【P0】test_info_1 已生成质量报告可查询", async ({ page }) => {
  const sourceRef = "SR-ARCHIVE-V6411-SQL-MERGE-L5296-L5368";

  await test.step("步骤1: 查询已生成报告接口 → 包含 test_info_1 完整性可合并规则报告", async () => {
    const reports = await queryGeneratedReports(page.request, sourceRef);
    expectGeneratedReportShape(reports, sourceRef);
  });

  await test.step("步骤2: 进入数据质量报告 → 页面提供已生成报告查询入口", async () => {
    await gotoDqSqlMergeRoute(page, "/dq/qualityReport", sourceRef);
    const body = page.locator("body");
    await expect(body, `${sourceRef}: 数据质量报告页应展示报告名称筛选`).toContainText("报告名称", {
      timeout: 30_000,
    });
    await expect(body, `${sourceRef}: 数据质量报告页应展示数据表或关联数据表列`).toContainText(/数据表|关联数据表/, {
      timeout: 30_000,
    });

    const generatedTab = page.getByText("已生成报告", { exact: true }).first();
    if (await generatedTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await generatedTab.click({ timeout: 30_000 });
      for (const header of ["报告名称", "关联数据表", "报告状态", "生成时间", "操作"]) {
        await expect(body, `${sourceRef}: 已生成报告页应展示列「${header}」`).toContainText(header, {
          timeout: 30_000,
        });
      }
    }
  });
});
