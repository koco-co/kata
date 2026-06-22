// spec: cases/archive.md#L126-L132,#L348-L354,#L5273-L5291
// intent: SR-INTENT-V6411-SQL-MERGE
// probe: runs/preflight-01/playwright/ui-probe/ui-probe-retry-2-result.json
// probe: runs/preflight-01/playwright/ui-probe/api-shape-probe-result.json
// SourceRefs: SR-ARCHIVE-V6411-SQL-MERGE-L126, SR-ARCHIVE-V6411-SQL-MERGE-L348, SR-ARCHIVE-V6411-SQL-MERGE-L5285, SR-UI-PROBE-V6411-SQL-MERGE-API-SHAPE
import { expect, test } from "@playwright/test";

import {
  expectMonitorRecordSqlShape,
  expectTargetMonitorRecord,
  gotoDqSqlMergeRoute,
  queryMonitorRecordDetail,
  queryMonitorRecords,
} from "../data/sql-merge-contract";

test.use({
  storageState:
    process.env.UI_AUTOTEST_SESSION_PATH ??
    "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
});
test.setTimeout(3 * 60 * 1000);

test("【P0】目标校验实例详情保留抽样、分区、过滤条件和规则 SQL 片段", async ({ page }) => {
  const sourceRef = "SR-ARCHIVE-V6411-SQL-MERGE-L126-L132";

  await test.step("步骤1: 查询目标校验实例 → 实例绑定目标表、分区和执行统计", async () => {
    const records = await queryMonitorRecords(page.request, sourceRef);
    const targetRecord = expectTargetMonitorRecord(records, sourceRef);
    const detailRows = await queryMonitorRecordDetail(page.request, targetRecord, sourceRef);
    expectMonitorRecordSqlShape(detailRows, sourceRef);
  });

  await test.step("步骤2: 进入校验结果查询 → 页面提供实例筛选和列表入口", async () => {
    await gotoDqSqlMergeRoute(page, "/dq/taskQuery", sourceRef);
    const searchInput = page
      .getByPlaceholder(/请输入表名\/任务名称搜索|任务名称|表名/)
      .or(page.locator("input[placeholder*='任务名称']"))
      .first();
    await expect(searchInput, `${sourceRef}: 校验结果查询应展示表名/任务名称搜索框`).toBeVisible({
      timeout: 30_000,
    });

    const body = page.locator("body");
    for (const header of ["表", "任务名称", "状态", "数据源", "计划时间", "操作"]) {
      await expect(body, `${sourceRef}: 校验结果查询应展示列「${header}」`).toContainText(header, {
        timeout: 30_000,
      });
    }
  });
});
