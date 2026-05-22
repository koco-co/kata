// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L3217-L3278,L13124-L13170
// intent: SR-INTENT-2099-01-DQ-001
// probe: SR-UI-PROBE-20260522-DQ-001
// page: _shared/pages/2099-01-lt-dq-main-flow/data-quality-page.ts
// generated_at: 2026-05-22T09:36:45Z
import { test } from "../../../../_shared/fixtures/step-screenshot";
import {
  expectDataQualityOverviewShell,
  expectDataQualityReportShell,
  expectDataQualityResultShell,
  expectDataQualityRuleBaseShell,
  expectDataQualityRuleSetShell,
  expectDataQualityRuleShell,
  expectMetadataIntegrityShell,
} from "../../../../_shared/pages/2099-01-lt-dq-main-flow/data-quality-page";

test.use({
  storageState:
    process.env.UI_AUTOTEST_SESSION_PATH ??
    "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
});
test.setTimeout(3 * 60 * 1000);

test("【P0/P1/P2】数据质量菜单、规则任务、报告与规则库 Shell 可核验", async ({ page, step }) => {
  await step("步骤1: 进入数据质量总览 → 菜单与概览统计模块可见", async () => {
    await expectDataQualityOverviewShell(page, "SR-2099-01-DQ-001");
  });

  await step("步骤2: 进入规则任务管理 → 列表字段与新建入口可见", async () => {
    await expectDataQualityRuleShell(page, "SR-2099-01-DQ-001");
  });

  await step("步骤3: 进入校验结果查询 → 执行结果列表字段可见", async () => {
    await expectDataQualityResultShell(page, "SR-2099-01-DQ-001");
  });

  await step("步骤4: 进入数据质量报告 → 报告配置列表和新增入口可见", async () => {
    await expectDataQualityReportShell(page, "SR-2099-01-DQ-001");
  });

  await step("步骤5: 进入规则集管理和规则库配置 → 规则集/规则库 Shell 可见", async () => {
    await expectDataQualityRuleSetShell(page, "SR-2099-01-DQ-001");
    await expectDataQualityRuleBaseShell(page, "SR-2099-01-DQ-001");
  });

  await step("步骤6: 进入元数据质量完整度分析 → 质量统计和分析列表可见", async () => {
    await expectMetadataIntegrityShell(page, "SR-2099-01-DQ-001");
  });
});
