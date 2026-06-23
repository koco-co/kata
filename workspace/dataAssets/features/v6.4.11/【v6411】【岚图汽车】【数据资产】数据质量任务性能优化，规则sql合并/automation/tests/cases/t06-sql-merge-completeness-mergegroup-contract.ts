// spec: cases/archive.md 步骤38（同过滤条件按强弱分类合并：源表只扫一次、子规则同 select）
// intent: SR-INTENT-V6411-SQL-MERGE
// probe: runs/preflight-02/playwright/preflight/probe-549.ts
// SourceRefs: SR-ARCHIVE-V6411-SQL-MERGE-MERGEGROUP, SR-UI-PROBE-V6411-SQL-MERGE-16
//
// 验证「完整性校验-多字段-通过/不通过」规则包的 5 条规则（空值数/率、空串数/率、表行数，
// 均为可合并 function、同过滤条件 id<=100、同强弱）可识别为「可合并候选组」——即 archive
// 步骤38 描述的合并前提。合并后的实际 SQL 文本在实例详情（环境受阻），此处只验证候选识别。
import { expect, test } from "@playwright/test";

import {
  DQ_SQL_MERGE_PACKAGES,
  expectCompletenessPackageShape,
  queryTargetRuleSetDetail,
} from "../data/sql-merge-contract";

test.use({
  storageState:
    process.env.UI_AUTOTEST_SESSION_PATH ??
    "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
});
test.setTimeout(3 * 60 * 1000);

test("【P0】完整性校验规则包的同过滤同强弱规则可识别为可合并候选组", async ({ page }) => {
  const sourceRef = "SR-ARCHIVE-V6411-SQL-MERGE-MERGEGROUP";

  await test.step("步骤1: 完整性校验-多字段-通过包 → 5 条完整性规则可合并", async () => {
    const detail = await queryTargetRuleSetDetail(page.request, sourceRef);
    expectCompletenessPackageShape(detail, DQ_SQL_MERGE_PACKAGES.completenessPass, sourceRef);
  });

  await test.step("步骤2: 完整性校验-多字段-不通过包 → 5 条完整性规则可合并", async () => {
    const detail = await queryTargetRuleSetDetail(page.request, sourceRef);
    expectCompletenessPackageShape(detail, DQ_SQL_MERGE_PACKAGES.completenessFail, sourceRef);
  });

  await test.step("步骤3: 完整性可合并规则包存在（对应已生成「完整性可合并规则」报告）", async () => {
    const detail = await queryTargetRuleSetDetail(page.request, sourceRef);
    const pkg = (detail.packageVOList ?? []).find(
      (item) => item.packageName === DQ_SQL_MERGE_PACKAGES.completenessMergeable,
    );
    expect(pkg?.packageName, `${sourceRef}: 应存在「完整性可合并规则」包`).toBe(
      DQ_SQL_MERGE_PACKAGES.completenessMergeable,
    );
    expect(
      (pkg?.rules ?? []).some((r) => r.functionName === "空值数"),
      `${sourceRef}: 「完整性可合并规则」包应含空值数规则`,
    ).toBe(true);
  });
});
