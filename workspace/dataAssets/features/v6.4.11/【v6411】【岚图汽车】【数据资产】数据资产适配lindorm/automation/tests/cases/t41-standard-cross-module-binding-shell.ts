// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L3867,#L3892,#L3907,#L3925,#L3942,#L4208,#L4486
// intent: SR-INTENT-2099-01-STD-041
// probe: SR-UI-PROBE-20260523-STANDARD-DEF-001, SR-UI-PROBE-20260522-DQ-001
// page: _shared/pages/2099-01-lt-dq-main-flow/standard-page.ts, _shared/pages/2099-01-lt-dq-main-flow/data-quality-page.ts
// generated_at: 2026-05-27T00:00:00+08:00
// META: {"id":"STD-041","priority":"P1/P2/P3","title":"数据标准跨质量规则绑定、下线与引用码表入口 Shell 可核验"}
// SourceRefs: SR-2099-01-STD-QUALITY-BINDING-L3867, SR-2099-01-STD-QUALITY-LIMIT-L3892, SR-2099-01-STD-QUALITY-ADD-DELETE-L3907, SR-2099-01-STD-QUALITY-EDIT-L3925, SR-2099-01-STD-QUALITY-CLEAR-L3942, SR-2099-01-STD-DEFINE-OFFLINE-USED-L4208, SR-2099-01-STD-TEMPLATE-REF-CODE-L4486, SR-2099-01-STD-041, SR-UI-PROBE-20260523-STANDARD-DEF-001, SR-UI-PROBE-20260522-DQ-001
import { expect } from "@playwright/test";

import { test } from "../../../../_shared/fixtures/step-screenshot";
import { expectDataQualityRuleTaskCreateEntry } from "../../../../_shared/pages/2099-01-lt-dq-main-flow/data-quality-page";
import { expectDataStandardDetailImportExportShell } from "../../../../_shared/pages/2099-01-lt-dq-main-flow/standard-page";

test.setTimeout(120000);

test("【P1/P2/P3】数据标准绑定质量规则、下线提示与引用码表入口可核验", async ({
  page,
  step,
}) => {
  await step("步骤1: 进入数据质量新建监控规则 → 规范性校验绑定标准相关配置入口可达", async () => {
    await expectDataQualityRuleTaskCreateEntry(
      page,
      "SR-2099-01-STD-QUALITY-BINDING-L3867, SR-2099-01-STD-QUALITY-LIMIT-L3892, SR-2099-01-STD-QUALITY-ADD-DELETE-L3907, SR-2099-01-STD-QUALITY-EDIT-L3925, SR-2099-01-STD-QUALITY-CLEAR-L3942",
    );
    await expect(page.locator("body"), "SR-2099-01-STD-041: 新建监控规则页面应展示规则配置流程入口").toContainText(
      /监控对象|规则名称|选择数据源|下一步/,
      { timeout: 30000 },
    );
  });

  await step("步骤2: 进入标准定义 → 标准下线、导入导出和引用码表相关操作区可达", async () => {
    await expectDataStandardDetailImportExportShell(
      page,
      "SR-2099-01-STD-DEFINE-OFFLINE-USED-L4208, SR-2099-01-STD-TEMPLATE-REF-CODE-L4486",
    );
    await expect(page.locator("body"), "SR-2099-01-STD-041: 标准定义页应展示标准操作区").toContainText(
      /上线|下线|导入标准|导出标准|新建标准|枚举范围|引用码表/,
      { timeout: 30000 },
    );
  });
});
