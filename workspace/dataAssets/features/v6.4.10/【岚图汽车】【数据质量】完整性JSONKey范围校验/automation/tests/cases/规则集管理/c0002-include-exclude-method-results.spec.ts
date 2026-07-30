// spec: features/completeness-json-key-range/archive.md#case=t02-method-switch
// intent: SR-INTENT-MIGRATED
// probe: SR-UI-PROBE-MIGRATED
// page: _shared/pages/PLACEHOLDER-page.ts
// META: {"id":"t2","priority":"P1","title":"验证校验方法切换（包含与不包含）规则保存和执行结果差异"}
import { expect, test } from "../../../../../../../_shared/automation/fixtures/step-screenshot";
import { selectAntOption } from "../../../../../../../../../runtime/automation/playwright";
import { addRuleToPackage, saveRuleSet } from "../../../../../../../_shared/automation/pages/data-quality/rule-set-editor";
import {
  ACTIVE_DATASOURCES,
  clearCurrentDatasource,
  setCurrentDatasource,
} from "../../fixtures/test-data";
import {
  assertOnlyTheseDetailRows,
  KEY_RANGE_RULE_NAME,
  openScenarioEditor,
  SCENARIOS,
  seedScenarioRuleSet,
} from "../../flows/rule-set-flow";
import {
  executeTaskFromList,
  getTaskDetailRuleCard,
  METHOD_SWITCH_TASK_NAME,
  openTaskInstanceDetail,
  openTaskRuleDetailDataDrawer,
  waitForTaskInstanceFinished,
} from "../../flows/rule-task-flow";


for (const datasource of ACTIVE_DATASOURCES) {
  test.describe(`${"【内置规则丰富】完整性，json中key值范围校验 - 校验方法切换"} - ${datasource.reportName}`, () => {
    test.describe.configure({ timeout: 600000 });

    test.beforeAll(() => setCurrentDatasource(datasource));
    test.beforeEach(() => setCurrentDatasource(datasource));
    test.afterAll(() => clearCurrentDatasource());

    test("验证校验方法切换（包含与不包含）规则保存和执行结果差异", async ({ page, step }) => {
      await step(
        "步骤1-2: 创建规则集并新增key范围校验规则（包含/key1+key2）→ 保存成功",
        async () => {
          await seedScenarioRuleSet(page, SCENARIOS.methodSwitch);
        },
      );

      await step("步骤3: 执行task_json_method_switch → 提示操作成功", async () => {
        await executeTaskFromList(page, METHOD_SWITCH_TASK_NAME);
      });

      await step("步骤4: 查看校验结果（id=1通过，id=2不通过）", async () => {
        const instanceRow = await waitForTaskInstanceFinished(
          page,
          METHOD_SWITCH_TASK_NAME,
          600000,
        );
        const detailDrawer = await openTaskInstanceDetail(page, instanceRow);
        const ruleCard = getTaskDetailRuleCard(detailDrawer, KEY_RANGE_RULE_NAME);
        await expect(ruleCard).toBeVisible({ timeout: 10000 });
        await expect(detailDrawer).toContainText("校验通过");
        await expect(detailDrawer).toContainText("校验不通过");
        const dataDrawer = await openTaskRuleDetailDataDrawer(page, detailDrawer);
        await assertOnlyTheseDetailRows(dataDrawer, [2]);
      });

      await step("步骤5: 修改校验方法为不包含并保存 → 保存成功", async () => {
        await openScenarioEditor(page, SCENARIOS.methodSwitch);
        const ruleForm = await addRuleToPackage(
          page,
          SCENARIOS.methodSwitch.packageName,
          "完整性校验",
        );
        const methodSelect = ruleForm
          .locator(".ant-form-item")
          .filter({ hasText: /校验方法/ })
          .locator(".ant-select")
          .first();
        await selectAntOption(page, methodSelect, "不包含");
        await saveRuleSet(page);
      });

      await step("步骤6: 再次执行task_json_method_switch → 提示操作成功", async () => {
        await executeTaskFromList(page, METHOD_SWITCH_TASK_NAME);
      });

      await step("步骤7: 查看校验结果（id=1不通过，id=2不通过）", async () => {
        const instanceRow = await waitForTaskInstanceFinished(
          page,
          METHOD_SWITCH_TASK_NAME,
          600000,
        );
        const detailDrawer = await openTaskInstanceDetail(page, instanceRow);
        const ruleCard = getTaskDetailRuleCard(detailDrawer, KEY_RANGE_RULE_NAME);
        await expect(ruleCard).toBeVisible({ timeout: 10000 });
        await expect(detailDrawer).toContainText("校验不通过");
        const dataDrawer = await openTaskRuleDetailDataDrawer(page, detailDrawer);
        await assertOnlyTheseDetailRows(dataDrawer, [1, 2]);
      });
    });
  });
}
