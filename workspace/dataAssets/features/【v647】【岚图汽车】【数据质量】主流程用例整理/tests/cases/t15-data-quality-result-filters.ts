// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L7974-L7988,#L11770-L11891,#L13143-L13158
// intent: SR-INTENT-2099-01-DQ-RESULT-FILTERS-001
// probe: results/20260523-1730-mf-quality-result-filters-01/playwright/ui-probe/probe.json
// page: _shared/pages/2099-01-lt-dq-main-flow/data-quality-page.ts
// generated_at: 2026-05-23T09:30:00Z
// SourceRefs: SR-2099-01-DQ-RESULT-FILTERS-001, SR-UI-PROBE-20260523-DQ-RESULT-FILTERS-001, SR-SELF-RUN-20260523-DQ-RESULT-FILTERS-001
import { test } from "../../../../_shared/fixtures/step-screenshot";
import {
  expectDataQualityGeneratedReportFilterContract,
  expectDataQualityResultFilterContract,
  expectDataQualityRuleBaseCustomRegexContract,
  expectDataQualityRuleSetFilterContract,
} from "../../../../_shared/pages/2099-01-lt-dq-main-flow/data-quality-page";

test.use({
  storageState:
    process.env.UI_AUTOTEST_SESSION_PATH ??
    "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
});
test.setTimeout(3 * 60 * 1000);

test("【P0/P1/P2】数据质量校验结果、规则集、规则库正则与报告筛选列表可核验", async ({ page, step }) => {
  await step("步骤1: 进入校验结果查询 → 计划时间、修改人、收藏表筛选与结果列表字段可见", async () => {
    await expectDataQualityResultFilterContract(page, "SR-2099-01-DQ-RESULT-FILTERS-001");
  });

  await step("步骤2: 进入规则集管理 → 表名搜索、新建入口和规则集列表字段可见", async () => {
    await expectDataQualityRuleSetFilterContract(page, "SR-2099-01-DQ-RESULT-FILTERS-001");
  });

  await step("步骤3: 进入规则库配置自定义正则 → 搜索框、列表字段和新增入口可见", async () => {
    await expectDataQualityRuleBaseCustomRegexContract(page, "SR-2099-01-DQ-RESULT-FILTERS-001");
  });

  await step("步骤4: 进入数据质量报告已生成报告 → 报告筛选项、状态列和操作列可见", async () => {
    await expectDataQualityGeneratedReportFilterContract(page, "SR-2099-01-DQ-RESULT-FILTERS-001");
  });
});
