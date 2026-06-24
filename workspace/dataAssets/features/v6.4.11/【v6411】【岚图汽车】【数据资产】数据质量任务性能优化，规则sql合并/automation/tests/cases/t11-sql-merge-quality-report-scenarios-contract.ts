// spec: cases/archive.md「质量报告正确」用例步骤40-42「查看质量报告」(有效性/完整性 通过·不通过)
// intent: SR-INTENT-V6411-SQL-MERGE
// probe: runs/preflight-03/out/report-names.json（各 test_info 表已生成质量报告命名）
// SourceRefs: SR-ARCHIVE-V6411-SQL-MERGE-REPORTSCENARIO, SR-UI-PROBE-V6411-SQL-MERGE-REPORTS
//
// 质量报告端到端核验：每个 sparkthrift 场景的命名质量报告(monitorReportRecord)已生成
// (status=1)，覆盖 archive「有效性校验/完整性校验 校验通过·不通过 质量报告正确」用例与
// 各表场景报告。不触发立即执行，只读已生成报告产物。
import { test } from "@playwright/test";

import {
  type DqScenarioReportSpec,
  expectScenarioReport,
  queryGeneratedReportsBySearch,
} from "../data/sql-merge-contract";

test.use({
  storageState:
    process.env.UI_AUTOTEST_SESSION_PATH ??
    "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
});

// 每个场景对应 archive 一个「质量报告正确」或「校验功能」用例的报告产出维度
const REPORT_SCENARIOS: Array<{ scene: string; spec: DqScenarioReportSpec }> = [
  // test_info_1：有效性/完整性 通过·不通过 质量报告（archive「质量报告正确」用例）
  {
    scene: "test_info_1 有效性校验·全通过 质量报告已生成",
    spec: { table: "test_info_1", nameIncludes: ["有效性校验", "全通过"] },
  },
  {
    scene: "test_info_1 完整性校验·全通过 质量报告已生成",
    spec: { table: "test_info_1", nameIncludes: ["完整性校验", "全通过"] },
  },
  {
    scene: "test_info_1 完整性校验·全不通过 质量报告已生成",
    spec: { table: "test_info_1", nameIncludes: ["完整性校验", "全不通过"] },
  },
  {
    scene: "test_info_1 完整性可合并规则 质量报告已生成",
    spec: { table: "test_info_1", nameIncludes: ["完整性可合并规则"] },
  },
  // test_info_2~8：各表场景质量报告
  {
    scene: "test_info_2 可合并+不可合并·单规则包 质量报告已生成",
    spec: { table: "test_info_2", nameIncludes: ["可合并+不可合并", "单规则包"] },
  },
  {
    scene: "test_info_3 可合并+不可合并·多规则包 质量报告已生成",
    spec: { table: "test_info_3", nameIncludes: ["可合并+不可合并", "多规则包"] },
  },
  {
    scene: "test_info_4 相同过滤条件·单规则包 质量报告已生成",
    spec: { table: "test_info_4", nameIncludes: ["相同过滤条件", "单规则包"] },
  },
  {
    scene: "test_info_5 不可合并部分规则 质量报告已生成",
    spec: { table: "test_info_5", nameIncludes: ["不可合并部分规则"] },
  },
  {
    scene: "test_info_6 完整性+有效性·多规则包 质量报告已生成",
    spec: { table: "test_info_6", nameIncludes: ["完整性+有效性", "多规则包"] },
  },
  {
    scene: "test_info_7 可合并完整性规则 质量报告已生成",
    spec: { table: "test_info_7", nameIncludes: ["可合并完整性规则"] },
  },
  {
    scene: "test_info_8 可合并有效性规则 质量报告已生成",
    spec: { table: "test_info_8", nameIncludes: ["可合并有效性规则"] },
  },
];

test.describe("【P1】质量报告按场景端到端契约（质量报告正确·步骤40-42）", () => {
  test.describe.configure({ timeout: 2 * 60 * 1000 });

  for (const { scene, spec } of REPORT_SCENARIOS) {
    test(scene, async ({ page }) => {
      const sourceRef = `SR-ARCHIVE-V6411-SQL-MERGE-REPORTSCENARIO#${spec.table}:${spec.nameIncludes.join("+")}`;
      const reports = await queryGeneratedReportsBySearch(page.request, spec.table, sourceRef);
      expectScenarioReport(reports, spec, sourceRef);
    });
  }
});
