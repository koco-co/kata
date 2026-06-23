// spec: cases/archive.md「可合并+不可合并」「不可合并」「可合并」section 的「校验功能」用例（配置维度）
// intent: SR-INTENT-V6411-SQL-MERGE
// probe: runs/preflight-02/playwright/preflight/inventory-result.json
// SourceRefs: SR-ARCHIVE-V6411-SQL-MERGE-SCENARIOS, SR-UI-PROBE-V6411-SQL-MERGE-15
//
// 一表一集（注意事项3）场景的配置层契约：test_info_2~8 各自的规则集精确对应 archive
// 「校验功能」用例的不同维度（不同/相同过滤条件、单/多规则包、不可合并部分、完整性+有效性、
// string强转int、强弱）。验证这些配置维度真实存在——这是 SQL 合并的输入前提。
// 运行时合并 SQL 文本/子规则通过不通过在校验实例详情（环境立即执行 504 受阻），不在此范围。
import { test } from "@playwright/test";

import {
  type DqPackageConfigSpec,
  expectPackageConfig,
  queryRuleSetDetailByTable,
} from "../data/sql-merge-contract";

test.use({
  storageState:
    process.env.UI_AUTOTEST_SESSION_PATH ??
    "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
});

// 每个场景对应 archive 一个或多个「校验功能」测试点的配置维度（盘点 SR-UI-PROBE-16 真实数据）
const TABLE_RULESET_SCENARIOS: Array<{
  table: string;
  scene: string;
  packages: DqPackageConfigSpec[];
}> = [
  {
    table: "test_info_2",
    scene: "可合并+不可合并 / 不同过滤条件 / 单规则包",
    packages: [
      { name: "可合并+不可合并+抽样开启+设置分区+不同过滤条件+单规则包", minRules: 19, strengths: ["1"] },
    ],
  },
  {
    table: "test_info_3",
    scene: "可合并+不可合并 / 相同过滤条件 / 多规则包（含强弱）",
    packages: [
      {
        name: "可合并+不可合并+抽样开启+设置分区+相同过滤条件+包含强弱规则+多规则包",
        minRules: 19,
        strengths: ["1", "2"],
      },
    ],
  },
  {
    table: "test_info_4",
    scene: "可合并+不可合并 / 相同过滤条件 / 单规则包",
    packages: [
      { name: "可合并+不可合并+抽样开启+设置分区+相同过滤条件+单规则包", minRules: 19, strengths: ["1"] },
    ],
  },
  {
    table: "test_info_5",
    scene: "不可合并部分规则",
    packages: [{ name: "不可合并部分规则", minRules: 12, strengths: ["1"] }],
  },
  {
    table: "test_info_6",
    scene: "完整性+有效性可合并 / 含强弱规则 / 多规则包",
    packages: [
      { name: "完整性+有效性可合并包含强弱规则，为多规则包", minRules: 9, strengths: ["1"] },
    ],
  },
  {
    table: "test_info_7",
    scene: "可合并完整性规则",
    packages: [{ name: "可合并完整性规则", minRules: 5, strengths: ["1"] }],
  },
  {
    table: "test_info_8",
    scene: "完整性+有效性多场景（过滤相同/不同、string强转int、单规则包强弱）",
    packages: [
      { name: "完整性+有效性可合并规则过滤条件相同", minRules: 8, strengths: ["1"] },
      { name: "完整性+有效性可合并规则过滤条件相同-string强转int", minRules: 5, strengths: ["1"] },
      { name: "完整性+有效性可合并规则过滤条件不同", minRules: 8, strengths: ["1"] },
      { name: "完整性+有效性可合并包含强弱规则，为单规则包", minRules: 8, strengths: ["1", "2"] },
    ],
  },
];

test.describe("【P1】一表一集场景的 SQL 合并配置维度契约", () => {
  test.describe.configure({ timeout: 3 * 60 * 1000 });

  for (const scenario of TABLE_RULESET_SCENARIOS) {
    test(`${scenario.table}: ${scenario.scene}`, async ({ page }) => {
      const sourceRef = `SR-ARCHIVE-V6411-SQL-MERGE-SCENARIOS#${scenario.table}`;
      const detail = await queryRuleSetDetailByTable(page.request, scenario.table, sourceRef);
      for (const spec of scenario.packages) {
        expectPackageConfig(detail, spec, sourceRef);
      }
    });
  }
});
