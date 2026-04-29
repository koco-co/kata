// spec: features/2026-04-you-xiao-xing-duo-gui-ze/archive.md#case=t12-case-12
// intent: SR-INTENT-MIGRATED
// probe: SR-UI-PROBE-MIGRATED
// page: _shared/pages/PLACEHOLDER-page.ts
// META: {"id":"t12","priority":"P1","title":"验证在规则集中已保存的且关系规则编辑切换为或关系后保存成功"}
import { expect, test } from "../../../../_shared/fixtures/step-screenshot";
import {
  ACTIVE_DATASOURCES,
  clearCurrentDatasource,
  setCurrentDatasource,
} from "../data/test-data";
import {
  addRuleToPackage,
  configureRangeEnumRule,
  getRulePackage,
  getRuleSetListRow,
  gotoRuleSetList,
  openRuleSetEditor,
  saveRuleSet,
  selectRuleRelation,
} from "../../../../_shared/pages/2026-04-you-xiao-xing-duo-gui-ze/rule-editor-helpers";

test.use({ storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc.json" });
test.setTimeout(600000);

for (const datasource of ACTIVE_DATASOURCES) {
  test.describe(`${"【内置规则丰富】有效性，支持设置字段多规则的且或关系(#15695) - 规则集管理"} - ${datasource.reportName}`, () => {
    test.beforeAll(() => {
      setCurrentDatasource(datasource);
    });

    test.beforeEach(() => {
      setCurrentDatasource(datasource);
    });

    test.afterAll(() => {
      clearCurrentDatasource();
    });
    test("验证在规则集中已保存的且关系规则编辑切换为或关系后保存成功", async ({ page, step }) => {
      await step(
        "步骤1: 进入规则集管理页面，等待列表加载完成 → 规则集管理页面打开，列表显示已有规则集数据行",
        async () => {
          await gotoRuleSetList(page);
          await expect(page.locator(".ant-table-row").first()).toBeVisible({ timeout: 10000 });
        },
        page.locator(".ant-table-tbody"),
      );

      await step(
        "步骤2: 找到ruleset_15695_and，点击编辑，将取值范围和枚举值关系从且切换为或 → 单选按钮切换为「或」被选中",
        async () => {
          await openRuleSetEditor(page, "ruleset_15695_and", ["且关系校验包"]);
          let packageSection = await getRulePackage(page, "且关系校验包");
          if ((await packageSection.locator(".ruleForm").count()) === 0) {
            const seededRule = await addRuleToPackage(page, "且关系校验包", "有效性校验");
            await configureRangeEnumRule(page, seededRule, {
              field: "score",
              range: {
                firstOperator: ">",
                firstValue: "1",
                condition: "且",
                secondOperator: "<",
                secondValue: "10",
              },
              enumOperator: "in",
              enumValues: ["1", "2", "3"],
              relation: "且",
              ruleStrength: "强规则",
            });
            await saveRuleSet(page);
            await gotoRuleSetList(page);
            await openRuleSetEditor(page, "ruleset_15695_and", ["且关系校验包"]);
            packageSection = await getRulePackage(page, "且关系校验包");
          }
          const ruleForm = packageSection.locator(".ruleForm").first();
          await expect(ruleForm).toBeVisible({ timeout: 10000 });

          await selectRuleRelation(ruleForm, "或");

          await expect(
            ruleForm
              .locator(".ant-radio-wrapper, .ant-radio-button-wrapper")
              .filter({ hasText: /^或$/ })
              .last(),
          ).toHaveClass(/checked/);
        },
        page.locator(".ruleForm").first(),
      );

      await step(
        "步骤3: 点击保存按钮，再点击页面底部保存 → 规则保存成功，且或关系列由且变更为或",
        async () => {
          await saveRuleSet(page);

          await expect(getRuleSetListRow(page, "ruleset_15695_and")).toBeVisible({
            timeout: 10000,
          });

          await openRuleSetEditor(page, "ruleset_15695_and", ["且关系校验包"]);
          const packageSection = await getRulePackage(page, "且关系校验包");
          const savedRuleForm = packageSection.locator(".ruleForm").first();
          await expect(
            savedRuleForm
              .locator(".ant-radio-wrapper, .ant-radio-button-wrapper")
              .filter({ hasText: /^或$/ })
              .last(),
          ).toHaveClass(/checked/);
        },
        page
          .locator(".ruleSetMonitor__package")
          .filter({ hasText: "且关系校验包" })
          .locator(".ruleForm")
          .first(),
      );
    });
  });
}
