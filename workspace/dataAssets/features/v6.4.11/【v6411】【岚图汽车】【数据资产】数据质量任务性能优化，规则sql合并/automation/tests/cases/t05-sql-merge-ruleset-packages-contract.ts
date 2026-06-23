// spec: cases/archive.md「可合并+不可合并」section（P0 多规则包/单规则包、完整性/有效性校验配置）
// intent: SR-INTENT-V6411-SQL-MERGE
// probe: runs/preflight-02/playwright/preflight/inventory-result.json
// SourceRefs: SR-ARCHIVE-V6411-SQL-MERGE-PKG, SR-UI-PROBE-V6411-SQL-MERGE-16
//
// 验证 test_info_1 规则集（id=549）的 6 个规则包配置齐全且形状正确——这是 SQL 合并的
// 「输入配置」：可合并/不可合并 function、强弱、过滤条件的组合。运行时合并 SQL 文本在
// 校验实例详情里（环境立即执行链路 504 受阻，见 t04），本用例只验证配置层。
import { expect, test } from "@playwright/test";

import {
  DQ_SQL_MERGE_PACKAGES,
  expectRuleSetPackageInventory,
  expectValidityPackageShape,
  queryTargetRuleSetDetail,
} from "../data/sql-merge-contract";

test.use({
  storageState:
    process.env.UI_AUTOTEST_SESSION_PATH ??
    "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
});
test.setTimeout(3 * 60 * 1000);

test("【P0】test_info_1 规则集 6 个规则包配置齐全且形状正确", async ({ page }) => {
  const sourceRef = "SR-ARCHIVE-V6411-SQL-MERGE-PKG";

  await test.step("步骤1: 查询目标规则集详情 → 6 个命名规则包齐全、规则数符合", async () => {
    const detail = await queryTargetRuleSetDetail(page.request, sourceRef);
    expectRuleSetPackageInventory(detail, sourceRef);
  });

  await test.step("步骤2: 有效性校验规则包结构（全通过 3 条、不通过 1 条）", async () => {
    const detail = await queryTargetRuleSetDetail(page.request, sourceRef);
    expectValidityPackageShape(detail, DQ_SQL_MERGE_PACKAGES.validityPass, 3, sourceRef);
    expectValidityPackageShape(detail, DQ_SQL_MERGE_PACKAGES.validityFail, 1, sourceRef);
  });

  await test.step("步骤3: 「多规则包」应同时含可合并与不可合并规则、强弱混合", async () => {
    const detail = await queryTargetRuleSetDetail(page.request, sourceRef);
    const pkg = (detail.packageVOList ?? []).find(
      (item) => item.packageName === DQ_SQL_MERGE_PACKAGES.mergeMulti,
    );
    expect(pkg?.packageName, `${sourceRef}: 应存在「多规则包」`).toBe(DQ_SQL_MERGE_PACKAGES.mergeMulti);
    const rules = pkg?.rules ?? [];
    // 可合并 function（空值数/率、空串数/率、表行数）
    for (const fn of ["空值数", "空值率", "空串数", "空串率", "表行数"]) {
      expect(
        rules.some((r) => r.functionName === fn),
        `${sourceRef}: 多规则包应含可合并 function ${fn}`,
      ).toBe(true);
    }
    // 不可合并 function（字段取值校验/重复数/多表唯一性判断/异常值检测）
    for (const fn of ["字段取值校验", "重复数", "多表唯一性判断", "异常值检测"]) {
      expect(
        rules.some((r) => r.functionName === fn),
        `${sourceRef}: 多规则包应含不可合并 function ${fn}`,
      ).toBe(true);
    }
    // 强弱混合
    const strengths = new Set(rules.map((r) => String(r.ruleStrength ?? "")));
    expect(strengths.has("1"), `${sourceRef}: 多规则包应含强规则`).toBe(true);
    expect(strengths.has("2"), `${sourceRef}: 多规则包应含弱规则`).toBe(true);
  });
});
