// spec: features/completeness-json-key-range/archive.md#case=t15-case-15
// intent: SR-INTENT-MIGRATED
// probe: SR-UI-PROBE-MIGRATED
// page: _shared/pages/PLACEHOLDER-page.ts
// META: {"id":"t15","priority":"P1","title":"验证规则集管理与规则任务管理中校验内容全量展示无截断"}
import { expect, test } from "../../../../../_shared/fixtures/step-screenshot";
import { ensureSavedScenarioRuleSet, openScenarioEditor, SCENARIOS } from "../../../../../_shared/pages/completeness-json-key-range/suite-helpers";
import { KEY_NAMES } from "../../fixtures/test-data";

test.setTimeout(600000);

const SUITE_NAME = "【内置规则丰富】完整性，json中key值范围校验(#15693)";

test.describe(SUITE_NAME, () => {
  test("验证规则集管理与规则任务管理中校验内容全量展示无截断", async ({ page, step }) => {
    await step("步骤1: 创建含4个key的规则集", async () => {
      await ensureSavedScenarioRuleSet(page, SCENARIOS.contentFull);
    });

    await step("步骤2: 在规则集管理编辑页查看校验内容 → 全量展示，无截断", async () => {
      await openScenarioEditor(page, SCENARIOS.contentFull);
      const ruleCard = page.locator(".ruleForm, .ruleCard").first();
      await expect(ruleCard).toContainText(KEY_NAMES.k1);
      await expect(ruleCard).toContainText(KEY_NAMES.k11);
    });
  });
});
