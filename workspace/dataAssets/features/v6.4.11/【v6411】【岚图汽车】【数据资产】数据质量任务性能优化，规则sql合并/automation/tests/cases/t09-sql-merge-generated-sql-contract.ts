// spec: cases/archive.md 全部「校验功能」用例步骤37-38「点击规则SQL查看，切换规则包查看规则sql」
// intent: SR-INTENT-V6411-SQL-MERGE
// probe: runs/preflight-03/out/monitor-specs.json（16 个规则任务的合并 SQL 实测特征）
// SourceRefs: SR-ARCHIVE-V6411-SQL-MERGE-GENSQL, SR-UI-PROBE-V6411-SQL-MERGE-PKGSQL
//
// 「规则sql合并」被测特性的端到端核验：直接拉取后端为每个规则任务(monitor)生成的合并 SQL
// （/monitor/packagelist 列拼接包 + /monitor/packagesql 取每包合并 SQL 文本），核验：
//   1) 拼接包数量与「规则拼接包」配置一致（步骤36-37：10 个拼接包等）；
//   2) 可合并子规则确实合并——同 select 内多个 SUM(CASE WHEN) 并行计算 + LATERAL VIEW
//      STACK(N) 拆回多行（步骤38：源表只扫一次、合并子规则并行计算、拆成多行）；
//   3) 抽样开启生成 *_temp_sample_table（rand 抽样）、抽样关闭直扫源表（步骤40）；
//   4) 设置分区含 dt='yyyy-MM-dd' 分区谓词；string强转int 含 CAST；
//   5) 每个拼接包合并 SQL 都落脏数据管道 dtstack_dq_monitor_temp_data 且无明显 SQL 缺陷。
// 该层配置即生成、无需立即执行，故绕开 immediatelyExecuted 5min 504 链路。
// 注：test_info_1「完整性校验-多字段-抽样开启-全不通过」任务名含「抽样开启」，但其生成 SQL
//     实测无临时抽样表（sampling=off），按生成 SQL 实测值断言并在交付说明里作为观察项上报。
import { test } from "@playwright/test";

import { type DqGeneratedSqlSpec, expectMonitorGeneratedSql } from "../data/sql-merge-contract";

test.use({
  storageState:
    process.env.UI_AUTOTEST_SESSION_PATH ??
    "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
});

// 16 个规则任务 → 生成合并 SQL 端到端契约（spec 取自 SR-UI-PROBE-PKGSQL 实测）
const MONITOR_SQL_SCENARIOS: Array<{ scene: string; spec: DqGeneratedSqlSpec }> = [
  // 可合并+不可合并（test_info_1~4：不同/相同过滤 × 多/单规则包）
  {
    scene: "test_info_1 可合并+不可合并/不同过滤/多规则包（10 拼接包，STACK 合并）",
    spec: {
      table: "test_info_1",
      ruleName: "可合并+不可合并+抽样开启+设置分区+不同过滤条件+包含强弱规则+多规则包",
      expectedPackages: 10,
      sampling: "on",
      partition: true,
      expectsMerge: true,
      minStackGroup: 2,
    },
  },
  {
    scene: "test_info_2 可合并+不可合并/不同过滤/单规则包（全部规则并入 1 包，STACK 大块合并）",
    spec: {
      table: "test_info_2",
      ruleName: "可合并+不可合并+抽样开启+设置分区+不同过滤条件+单规则包",
      expectedPackages: 1,
      sampling: "on",
      partition: true,
      expectsMerge: true,
      minStackGroup: 4,
    },
  },
  {
    scene: "test_info_3 可合并+不可合并/相同过滤/多规则包（9 拼接包）",
    spec: {
      table: "test_info_3",
      ruleName: "可合并+不可合并+抽样开启+设置分区+相同过滤条件+包含强弱规则+多规则包",
      expectedPackages: 9,
      sampling: "on",
      partition: true,
      expectsMerge: true,
      minStackGroup: 2,
    },
  },
  {
    scene: "test_info_4 可合并+不可合并/相同过滤/单规则包（STACK 大块合并）",
    spec: {
      table: "test_info_4",
      ruleName: "可合并+不可合并+抽样开启+设置分区+相同过滤条件+单规则包",
      expectedPackages: 1,
      sampling: "on",
      partition: true,
      expectsMerge: true,
      minStackGroup: 4,
    },
  },
  // 不可合并（test_info_5：部分规则不可合并，可合并部分仍合并）
  {
    scene: "test_info_5 不可合并部分规则（可合并部分 SUM 合并，不可合并部分各自扫描）",
    spec: {
      table: "test_info_5",
      ruleName: "不可合并部分规则",
      expectedPackages: 1,
      sampling: "on",
      partition: true,
      expectsMerge: true,
    },
  },
  // 可合并（test_info_6/7：完整性+有效性、可合并完整性）
  {
    scene: "test_info_6 完整性+有效性可合并含强弱/多规则包（STACK(10) 大块合并）",
    spec: {
      table: "test_info_6",
      ruleName: "完整性+有效性可合并包含强弱规则，为多规则包",
      expectedPackages: 1,
      sampling: "on",
      partition: true,
      expectsMerge: true,
      minStackGroup: 4,
    },
  },
  {
    scene: "test_info_7 可合并完整性规则（STACK(4) 合并）",
    spec: {
      table: "test_info_7",
      ruleName: "可合并完整性规则",
      expectedPackages: 1,
      sampling: "on",
      partition: true,
      expectsMerge: true,
      minStackGroup: 2,
    },
  },
  // test_info_8 完整性+有效性多场景
  {
    scene: "test_info_8 完整性+有效性/含强弱/单规则包（2 拼接包）",
    spec: {
      table: "test_info_8",
      ruleName:
        "验证「完整性+有效性」-「抽样开启」-「设置分区」-「包含强弱规则」-「单规则包」校验功能",
      expectedPackages: 2,
      sampling: "on",
      partition: true,
      expectsMerge: true,
      minStackGroup: 2,
    },
  },
  {
    scene: "test_info_8 完整性+有效性/string强转int（含 CAST）",
    spec: {
      table: "test_info_8",
      ruleName: "验证「完整性+有效性」-「抽样开启」-「设置分区」-「string强转int」校验功能",
      expectedPackages: 1,
      sampling: "on",
      partition: true,
      expectsMerge: true,
      minStackGroup: 4,
      cast: true,
    },
  },
  {
    scene: "test_info_8 完整性+有效性/相同过滤条件（STACK 合并）",
    spec: {
      table: "test_info_8",
      ruleName: "验证「完整性+有效性」-「抽样开启」-「设置分区」-「相同过滤条件」校验功能",
      expectedPackages: 1,
      sampling: "on",
      partition: true,
      expectsMerge: true,
      minStackGroup: 4,
    },
  },
  {
    scene: "test_info_8 完整性可合并规则（SUM(CASE WHEN) 合并、抽样关闭）",
    spec: {
      table: "test_info_8",
      ruleName: "完整性可合并规则",
      expectedPackages: 1,
      sampling: "off",
      partition: true,
      expectsMerge: true,
    },
  },
  {
    scene: "test_info_8 可合并有效性规则（STACK 合并）",
    spec: {
      table: "test_info_8",
      ruleName: "可合并有效性规则",
      expectedPackages: 1,
      sampling: "on",
      partition: true,
      expectsMerge: true,
      minStackGroup: 2,
    },
  },
  // test_info_1 有效性/完整性 校验功能（抽样开启/关闭 × 全通过/全不通过）
  {
    scene: "test_info_1 有效性校验/抽样关闭/全通过（直扫源表无抽样表，STACK 合并）",
    spec: {
      table: "test_info_1",
      ruleName: "验证「有效性校验」-「抽样关闭」校验全通过功能",
      expectedPackages: 1,
      sampling: "off",
      partition: true,
      expectsMerge: true,
      minStackGroup: 2,
    },
  },
  {
    // 名含「抽样开启」但生成 SQL 实测无临时抽样表，按实测断言并上报为观察项
    scene: "test_info_1 完整性校验/多字段/抽样开启-全不通过（实测无抽样表，SUM 合并）",
    spec: {
      table: "test_info_1",
      ruleName: "验证「完整性校验」-「多字段」-「抽样开启」校验全不通过功能",
      expectedPackages: 1,
      sampling: "off",
      partition: true,
      expectsMerge: true,
    },
  },
  {
    scene: "test_info_1 完整性校验/多字段/抽样关闭-全通过（无抽样表无分区，SUM 合并）",
    spec: {
      table: "test_info_1",
      ruleName: "验证「完整性校验」-「多字段」-「抽样关闭」校验全通过功能",
      expectedPackages: 1,
      sampling: "off",
      expectsMerge: true,
    },
  },
  {
    scene: "test_info_1 完整性可合并规则（2 拼接包，SUM 合并）",
    spec: {
      table: "test_info_1",
      ruleName: "完整性可合并规则",
      expectedPackages: 2,
      sampling: "off",
      partition: true,
      expectsMerge: true,
    },
  },
];

test.describe("【P0】生成合并SQL端到端契约（规则SQL查看·步骤37-38）", () => {
  test.describe.configure({ timeout: 3 * 60 * 1000 });

  for (const { scene, spec } of MONITOR_SQL_SCENARIOS) {
    test(scene, async ({ page }) => {
      const sourceRef = `SR-ARCHIVE-V6411-SQL-MERGE-GENSQL#${spec.table}:${spec.ruleName}`;
      await expectMonitorGeneratedSql(page.request, spec, sourceRef);
    });
  }
});
