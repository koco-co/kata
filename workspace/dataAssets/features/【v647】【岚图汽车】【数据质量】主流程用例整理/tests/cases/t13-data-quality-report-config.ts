// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L7115-L7138,L7306-L7334,L13141-L13181
// intent: SR-INTENT-2099-01-DQ-REPORT-CONFIG-001
// probe: SR-UI-PROBE-20260523-DQ-REPORT-CONFIG-001
// page: _shared/pages/2099-01-lt-dq-main-flow/data-quality-page.ts
// generated_at: 2026-05-23T07:40:00Z
import { test } from "../../../../_shared/fixtures/step-screenshot";
import {
  expectDataQualityGeneratedReportTab,
  expectDataQualityReportCreateEntry,
  expectDataQualityRuleBaseCustomSqlTemplate,
  expectDataQualityRuleSetCreateEntry,
  expectDataQualityRuleTaskCreateEntry,
} from "../../../../_shared/pages/2099-01-lt-dq-main-flow/data-quality-page";

test.use({
  storageState:
    process.env.UI_AUTOTEST_SESSION_PATH ??
    "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
});
test.setTimeout(3 * 60 * 1000);

test("【P0/P1】数据质量报告、规则任务、规则集与自定义SQL模板入口可核验", async ({ page, step }) => {
  await step("步骤1: 切换数据质量报告已生成报告页签 → 筛选项、列表字段与报告详情入口可见", async () => {
    await expectDataQualityGeneratedReportTab(page, "SR-2099-01-DQ-REPORT-CONFIG-001");
  });

  await step("步骤2: 打开新增报告入口 → 报告基础配置字段可见且未提交表单", async () => {
    await expectDataQualityReportCreateEntry(page, "SR-2099-01-DQ-REPORT-CONFIG-001");
  });

  await step("步骤3: 打开新建监控规则入口 → 监控对象基础字段可见且未提交表单", async () => {
    await expectDataQualityRuleTaskCreateEntry(page, "SR-2099-01-DQ-REPORT-CONFIG-001");
  });

  await step("步骤4: 打开新建规则集入口 → 规则集基础字段和规则包名称可见且未提交表单", async () => {
    await expectDataQualityRuleSetCreateEntry(page, "SR-2099-01-DQ-REPORT-CONFIG-001");
  });

  await step("步骤5: 打开规则库自定义SQL模板 → 列表与新增模板基础配置可见", async () => {
    await expectDataQualityRuleBaseCustomSqlTemplate(page, "SR-2099-01-DQ-REPORT-CONFIG-001");
  });
});
