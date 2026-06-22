// spec: cases/archive.md#L22-L132,#L244-L354,#L5273-L5368
// intent: SR-INTENT-V6411-SQL-MERGE
// probe: runs/preflight-01/playwright/ui-probe/ui-probe-retry-2-result.json
// probe: runs/preflight-01/playwright/ui-probe/api-shape-probe-result.json
// SourceRefs: SR-ARCHIVE-V6411-SQL-MERGE-L22, SR-ARCHIVE-V6411-SQL-MERGE-L244, SR-UI-PROBE-V6411-SQL-MERGE-02, SR-UI-PROBE-V6411-SQL-MERGE-API-SHAPE
import { expect, test } from "@playwright/test";

import {
  DQ_SQL_MERGE_FULL_TABLE,
  DQ_SQL_MERGE_TABLE,
  DQ_SQL_MERGE_TARGET_TASK,
  expectRuleSetMergeShape,
  expectTargetRuleSet,
  expectTargetRuleTask,
  gotoDqSqlMergeRoute,
  queryRuleSetDetail,
  queryRuleSetList,
  queryRuleTasks,
} from "../data/sql-merge-contract";

test.use({
  storageState:
    process.env.UI_AUTOTEST_SESSION_PATH ??
    "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
});
test.setTimeout(3 * 60 * 1000);

test("【P0】test_info_1 规则集、规则包和目标规则任务配置可核验", async ({ page }) => {
  const sourceRef = "SR-ARCHIVE-V6411-SQL-MERGE-L22-L354";

  await test.step("步骤1: 进入规则集管理 → test_info_1 规则集存在且规则包未超过上限", async () => {
    await gotoDqSqlMergeRoute(page, "/dq/ruleSet", sourceRef);
    await expect(page.locator("body"), `${sourceRef}: 规则集管理页应展示目标表`).toContainText(
      DQ_SQL_MERGE_TABLE,
      { timeout: 30_000 },
    );

    const ruleSets = await queryRuleSetList(page.request, sourceRef);
    const targetRuleSet = expectTargetRuleSet(ruleSets, sourceRef);
    const detail = await queryRuleSetDetail(page.request, targetRuleSet.id!, sourceRef);
    expectRuleSetMergeShape(detail, sourceRef);
  });

  await test.step("步骤2: 进入规则任务管理 → 目标任务绑定 pw_test.test_info_1 且开启检测", async () => {
    await gotoDqSqlMergeRoute(page, "/dq/rule", sourceRef);
    await expect(page.locator("body"), `${sourceRef}: 规则任务管理页应展示目标任务`).toContainText(
      DQ_SQL_MERGE_TARGET_TASK,
      { timeout: 30_000 },
    );
    await expect(page.locator("body"), `${sourceRef}: 规则任务管理页应展示目标表全名`).toContainText(
      DQ_SQL_MERGE_FULL_TABLE,
      { timeout: 30_000 },
    );

    const ruleTasks = await queryRuleTasks(page.request, sourceRef);
    expectTargetRuleTask(ruleTasks, sourceRef);
  });
});
