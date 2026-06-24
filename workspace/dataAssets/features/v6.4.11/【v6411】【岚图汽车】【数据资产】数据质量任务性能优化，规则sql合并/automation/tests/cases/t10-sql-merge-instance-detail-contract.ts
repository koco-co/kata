// spec: cases/archive.md「校验功能」用例步骤39「临时运行规则，查看实例详情」+「查看明细功能」用例
// intent: SR-INTENT-V6411-SQL-MERGE
// probe: runs/preflight-03/out/instance-detail.json（目标规则任务已落库的校验实例详情）
// SourceRefs: SR-ARCHIVE-V6411-SQL-MERGE-INSTANCE, SR-UI-PROBE-V6411-SQL-MERGE-DETAIL
//
// 运行时校验实例端到端核验：读取调度已产出、已落库的校验实例(monitorRecord)及其详情
// (detailReport)，核验每条子规则带可执行 SQL、引用源表、无明显 SQL 缺陷，对应步骤39
// 「实例详情」与「查看明细」。不触发立即执行（immediatelyExecuted 5min 504 受阻），只读
// 已存在的运行时证据；实例为日调度产物，若环境运行时数据缺失则为真实失败信号，不弱化掩盖。
import { test } from "@playwright/test";

import {
  DQ_SQL_MERGE_FULL_TABLE,
  DQ_SQL_MERGE_TARGET_TASK,
  expectInstanceExecutedSql,
  findCompletedInstance,
  queryMonitorRecordDetail,
  queryMonitorRecords,
} from "../data/sql-merge-contract";

test.use({
  storageState:
    process.env.UI_AUTOTEST_SESSION_PATH ??
    "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
});

// 有稳定已完成实例的目标规则任务（同名任务按全表名过滤，避免 test_info_8 同名串扰）
const INSTANCE_SCENARIOS: Array<{ scene: string; ruleName: string; fullTable: string; table: string }> = [
  {
    scene: "主任务·不同过滤多规则包 实例详情含合并子规则执行SQL",
    ruleName: DQ_SQL_MERGE_TARGET_TASK,
    fullTable: DQ_SQL_MERGE_FULL_TABLE,
    table: "test_info_1",
  },
  {
    scene: "完整性可合并规则 实例详情含执行SQL",
    ruleName: "完整性可合并规则",
    fullTable: DQ_SQL_MERGE_FULL_TABLE,
    table: "test_info_1",
  },
];

test.describe("【P0】运行时校验实例详情契约（实例详情·查看明细·步骤39/41）", () => {
  test.describe.configure({ timeout: 3 * 60 * 1000 });

  for (const { scene, ruleName, fullTable, table } of INSTANCE_SCENARIOS) {
    test(scene, async ({ page }) => {
      const sourceRef = `SR-ARCHIVE-V6411-SQL-MERGE-INSTANCE#${table}:${ruleName}`;
      const all = await queryMonitorRecords(page.request, sourceRef, ruleName);
      const records = all.filter((r) => r.tableName === fullTable);
      const completed = findCompletedInstance(records, ruleName, sourceRef);
      const detail = await queryMonitorRecordDetail(page.request, completed, sourceRef);
      expectInstanceExecutedSql(detail, table, sourceRef);
    });
  }
});
