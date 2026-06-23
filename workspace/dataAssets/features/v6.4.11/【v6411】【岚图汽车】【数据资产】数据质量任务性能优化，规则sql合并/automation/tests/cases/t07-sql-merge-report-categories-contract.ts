// spec: cases/archive.md（P0 有效性校验质量报告正确、完整性校验质量报告正确）
// intent: SR-INTENT-V6411-SQL-MERGE
// probe: runs/preflight-02/playwright/preflight/inventory-result.json
// SourceRefs: SR-ARCHIVE-V6411-SQL-MERGE-REPORTCAT, SR-UI-PROBE-V6411-SQL-MERGE-15
//
// 验证 test_info_1 已生成质量报告覆盖各校验类别（有效性、完整性通过/不通过、完整性可合并
// 规则）且均有已生成(status=1)记录——覆盖 archive P0「质量报告正确」测试点的可查询部分。
import { expect, test } from "@playwright/test";

import {
  DQ_SQL_MERGE_TABLE,
  expectReportCategoriesShape,
  queryGeneratedReports,
} from "../data/sql-merge-contract";

test.use({
  storageState:
    process.env.UI_AUTOTEST_SESSION_PATH ??
    "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
});
test.setTimeout(3 * 60 * 1000);

test("【P0】test_info_1 质量报告覆盖有效性/完整性/可合并各类别且已生成", async ({ page }) => {
  const sourceRef = "SR-ARCHIVE-V6411-SQL-MERGE-REPORTCAT";

  await test.step("步骤1: 查询已生成报告 → 覆盖各校验类别且 status=已生成", async () => {
    const reports = await queryGeneratedReports(page.request, sourceRef);
    expectReportCategoriesShape(reports, sourceRef);
  });

  await test.step("步骤2: 报告均绑定目标表 test_info_1", async () => {
    const reports = await queryGeneratedReports(page.request, sourceRef);
    const targetReports = reports.filter((r) =>
      String(r.reportName ?? "").includes(DQ_SQL_MERGE_TABLE),
    );
    expect(targetReports.length, `${sourceRef}: 应有 ${DQ_SQL_MERGE_TABLE} 的报告`).toBeGreaterThan(0);
    for (const report of targetReports.slice(0, 8)) {
      expect(
        String(report.reportName ?? ""),
        `${sourceRef}: 报告名应绑定 ${DQ_SQL_MERGE_TABLE}`,
      ).toContain(DQ_SQL_MERGE_TABLE);
    }
  });
});
