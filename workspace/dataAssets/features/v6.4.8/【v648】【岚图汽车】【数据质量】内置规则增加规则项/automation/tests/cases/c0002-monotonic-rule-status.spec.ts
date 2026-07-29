// spec: features/rule-library/archive.md#case=t02-monitor-new-rule-categories
// intent: SR-INTENT-MIGRATED
// probe: SR-UI-PROBE-MIGRATED
// page: _shared/pages/PLACEHOLDER-page.ts
// META: {"id":"t02","priority":"P0","title":"验证新增内置规则分类可在监控规则添加菜单中选择"}
// SourceRefs: SR-INTENT-001, SR-UI-PROBE-002, SR-UI-PROBE-003, SR-SELF-RUN-001
import { expect, test } from "../../../../../../_shared/fixtures/step-screenshot";
import { EXPECTED_RULE_CATEGORIES, SOURCE_REFS } from "../fixtures/rule-library-contract";
import { gotoMonitorRuleStep2, readAddRuleMenu } from "../../../../../../_shared/pages/rule-library/rule-library-page";

test.setTimeout(120000);

test("【P0】添加规则菜单包含时效性校验和合理性校验", async ({ page, step }) => {
  let menuItems: string[] = [];

  await step("步骤1: 新建单表校验规则并进入监控规则步骤 → 添加规则按钮可见", async () => {
    await gotoMonitorRuleStep2(page);
  });

  await step("步骤2: 打开添加规则菜单 → 新增规则分类可选择", async () => {
    menuItems = await readAddRuleMenu(page);
    for (const category of EXPECTED_RULE_CATEGORIES) {
      expect(
        menuItems,
        `${SOURCE_REFS.intent} ${SOURCE_REFS.addRuleMenu}: 添加规则菜单应包含「${category}」，实际为 ${menuItems.join(", ")}`,
      ).toContain(category);
    }
  });
});
