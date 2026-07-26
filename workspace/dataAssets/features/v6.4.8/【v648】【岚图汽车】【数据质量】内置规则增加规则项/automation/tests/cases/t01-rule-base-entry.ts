// spec: features/rule-library/archive.md#case=t01-rule-base-entry
// intent: SR-INTENT-MIGRATED
// probe: SR-UI-PROBE-MIGRATED
// page: _shared/pages/PLACEHOLDER-page.ts
// META: {"id":"t01","priority":"P0","title":"验证规则库配置入口可访问并展示内置规则能力"}
// SourceRefs: SR-INTENT-001, SR-UI-PROBE-001, SR-UI-PROBE-002, SR-SELF-RUN-001
<<<<<<< HEAD
import { expect, test } from "../../../../../../_shared/fixtures/step-screenshot";
import { EXPECTED_RULE_BASE_TEXT, SOURCE_REFS } from "../fixtures/rule-library-contract";
import { gotoRuleBaseCandidate } from "../../../../../../_shared/pages/rule-library/rule-library-page";
=======
import { expect, test } from "../../../../_shared/fixtures/step-screenshot";
import { EXPECTED_RULE_BASE_TEXT, SOURCE_REFS } from "../fixtures/rule-library-contract";
import { gotoRuleBaseCandidate } from "../../../../_shared/pages/rule-library/rule-library-page";
>>>>>>> origin/main

test.setTimeout(90000);

test("【P0】规则库配置入口可访问并展示内置规则/导出能力", async ({ page, step }) => {
  await step("步骤1: 进入数据质量规则库配置候选路由 → 不应进入 404 页面", async () => {
    await gotoRuleBaseCandidate(page);
    await expect(page.locator("body"), `${SOURCE_REFS.intent} ${SOURCE_REFS.preflight}`).not.toContainText(
      "亲，是不是走错地方了？",
      { timeout: 10000 },
    );
  });

  await step("步骤2: 检查规则库配置页面关键能力 → 内置规则和导出入口可见", async () => {
    for (const text of EXPECTED_RULE_BASE_TEXT) {
      await expect(page.locator("body"), `${SOURCE_REFS.intent}: 规则库页面应展示「${text}」`).toContainText(text);
    }
  });
});
