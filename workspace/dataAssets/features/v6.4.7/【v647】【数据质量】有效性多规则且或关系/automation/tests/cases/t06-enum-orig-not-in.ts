import { waitForUiSettled } from "../../../../../../_shared/helpers/index";
// spec: features/validity-multi-rule-logic/archive.md#case=t06-enum-orig-not-in
// intent: SR-INTENT-MIGRATED
// probe: SR-UI-PROBE-MIGRATED
// page: _shared/pages/PLACEHOLDER-page.ts
// META: {"id":"t6","priority":"P2","title":"验证原有枚举值规则同步新增not in选项且可正常保存"}
import { expect, test } from "../../../../_shared/fixtures/step-screenshot";
import { selectAntOption } from "../../../../_shared/helpers/test-setup";
import {
  ACTIVE_DATASOURCES,
  clearCurrentDatasource,
  setCurrentDatasource,
} from "../fixtures/test-data";
import {
  addRuleToPackage,
  getRulePackage,
  getRuleSetListRow,
  getSelectOptions,
  gotoRuleSetList,
  openRuleSetEditor,
  saveRuleSet,
  selectRuleFieldAndFunction,
} from "../../../../_shared/pages/validity-multi-rule-logic/rule-editor-helpers";

test.setTimeout(600000);

const SUITE_NAME = "【内置规则丰富】有效性，支持设置字段多规则的且或关系(#15695)";
const PAGE_NAME = "规则集管理";

for (const datasource of ACTIVE_DATASOURCES) {
  test.describe(`${`${SUITE_NAME} - ${PAGE_NAME}`} - ${datasource.reportName}`, () => {
    test.beforeAll(() => {
      setCurrentDatasource(datasource);
    });

    test.beforeEach(() => {
      setCurrentDatasource(datasource);
    });

    test.afterAll(() => {
      clearCurrentDatasource();
    });

    test("验证原有枚举值规则同步新增not in选项且可正常保存", async ({ page, step }) => {
      await step(
        "步骤1: 进入规则集管理页面 → 页面打开，列表显示已有规则集数据行",
        async () => {
          await gotoRuleSetList(page);
          await expect(page.locator(".ant-table-row").first()).toBeVisible({ timeout: 15000 });
        },
        page.locator(".ant-table-tbody"),
      );

      await step(
        "步骤2: 找到 ruleset_15695_enum_orig 点击编辑，新增枚举值规则（非取值范围&枚举范围）并查看操作符下拉框 → 操作符包含 in 和 not in 两个选项",
        async () => {
          await openRuleSetEditor(page, "ruleset_15695_enum_orig", ["原枚举值包"]);
          await expect(
            page.locator(".ruleSetMonitor__package").filter({ hasText: "原枚举值包" }).first(),
          ).toBeVisible({ timeout: 10000 });

          const ruleForm = await addRuleToPackage(page, "原枚举值包");
          const functionRow = await selectRuleFieldAndFunction(
            page,
            ruleForm,
            "category",
            "枚举值",
          );

          const enumOperatorSelect = functionRow.locator(".ant-select").nth(1);
          const options = await getSelectOptions(page, enumOperatorSelect);
          expect(options).toContain("in");
          expect(options).toContain("not in");

          await selectAntOption(page, enumOperatorSelect, "not in");
          const enumInput = functionRow.locator(".ant-select").nth(2).locator("input").last();
          for (const value of ["4", "5"]) {
            await enumInput.fill(value);
            await page.keyboard.press("Enter");
            await waitForUiSettled(page);
          }

          await expect(enumOperatorSelect).toContainText("not in");
          await expect(ruleForm).toContainText("category");
        },
        page.locator(".ruleSetMonitor__package").filter({ hasText: "原枚举值包" }).first(),
      );

      await step(
        "步骤3: 保存规则集后重新进入编辑页 → 枚举值规则回显 not in 4、5",
        async () => {
          await saveRuleSet(page);
          await gotoRuleSetList(page);

          await expect(getRuleSetListRow(page, "ruleset_15695_enum_orig")).toBeVisible({
            timeout: 10000,
          });

          await openRuleSetEditor(page, "ruleset_15695_enum_orig");
          const packageSection = await getRulePackage(page, "原枚举值包");
          await expect(packageSection).toContainText("枚举值");
          await expect(packageSection).toContainText("not in");

          const enumTags = packageSection.locator(".ant-tag, .ant-select-selection-item");
          await expect(enumTags.filter({ hasText: "4" }).first()).toBeVisible();
          await expect(enumTags.filter({ hasText: "5" }).first()).toBeVisible();
        },
        page.locator(".ruleSetMonitor__package").filter({ hasText: "原枚举值包" }).first(),
      );
    });
  });
}
