// spec: features/rule-library/archive.md#case=t03-new-builtins-function-contract
// intent: SR-INTENT-MIGRATED
// probe: SR-UI-PROBE-MIGRATED
// page: _shared/pages/PLACEHOLDER-page.ts
// META: {"id":"t03","priority":"P1","title":"验证新增内置规则名称、解释、分类、关联范围和描述契约"}
// SourceRefs: SR-INTENT-001, SR-UI-PROBE-002, SR-UI-PROBE-003, SR-SELF-RUN-001
import { expect, test } from "../../../../_shared/fixtures/step-screenshot";
import { EXPECTED_NEW_RULES, SOURCE_REFS } from "../data/rule-library-contract";
import { gotoMonitorRuleStep2, readAddRuleMenu } from "../../../../_shared/pages/rule-library/rule-library-page";

test.setTimeout(120000);

test("【P1】新增内置规则契约在规则配置入口可被发现", async ({ page, step }) => {
  let menuItems: string[] = [];

  await step("步骤1: 进入监控规则配置步骤 → 添加规则菜单可打开", async () => {
    await gotoMonitorRuleStep2(page);
    menuItems = await readAddRuleMenu(page);
  });

  await step("步骤2: 校验新增内置规则所属分类 → 分类入口存在", async () => {
    const expectedCategories = [...new Set(EXPECTED_NEW_RULES.map((rule) => rule.category))];
    for (const category of expectedCategories) {
      expect(
        menuItems,
        `${SOURCE_REFS.intent} ${SOURCE_REFS.addRuleMenu}: 新增内置规则所属分类「${category}」应可选择`,
      ).toContain(category);
    }
  });

  await step("步骤3: 校验新增内置规则契约 → 名称/解释/范围/描述均有测试期望", async () => {
    expect(EXPECTED_NEW_RULES, SOURCE_REFS.intent).toEqual([
      expect.objectContaining({
        ruleName: "及时性校验",
        explanation: "多字段时间差校验",
        category: "时效性校验",
        scope: "字段",
      }),
      expect.objectContaining({
        ruleName: "周期性校验",
        explanation: "单字段时间差校验",
        category: "时效性校验",
        scope: "字段",
      }),
      expect.objectContaining({
        ruleName: "数据变化趋势",
        explanation: "单调递增、单调递减校验",
        category: "合理性校验",
        scope: "字段",
      }),
    ]);
  });
});
