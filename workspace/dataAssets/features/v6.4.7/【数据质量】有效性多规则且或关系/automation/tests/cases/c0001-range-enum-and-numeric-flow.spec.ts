// spec: features/validity-multi-rule-logic/archive.md#case=t01-case-01
// intent: SR-INTENT-MIGRATED
// probe: SR-UI-PROBE-MIGRATED
// page: _shared/pages/PLACEHOLDER-page.ts
// META: {"id":"t1","priority":"P1","title":"新建取值范围&枚举范围且关系规则"}
import { expect, test } from "../../../../../../_shared/automation/fixtures/step-screenshot";
import {
  ACTIVE_DATASOURCES,
  clearCurrentDatasource,
  setCurrentDatasource,
} from "../fixtures/test-data";
import { addRuleToPackage, saveRuleSet } from "../../../../../../_shared/automation/pages/data-quality/rule-set-editor";
import { configureRangeEnumRule, createRuleSetDraft, deleteRuleSetsByTableNames, getRuleSetListRow, gotoRuleSetList } from "../pages/range-enum-rule-editor";

test.setTimeout(600000);

const SUITE_NAME = "【内置规则丰富】有效性，支持设置字段多规则的且或关系(#15695)";
const PAGE_NAME = "规则集管理";
const packageName = "且关系校验包";

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
    test("新建取值范围&枚举范围且关系规则", async ({ page, step }) => {
      await step(
        "步骤1: 进入规则集管理页面 → 规则集管理页面打开，列表显示已有规则集数据行",
        async () => {
          await gotoRuleSetList(page);
          await expect(page.locator(".ant-table-tbody")).toBeVisible({ timeout: 15000 });
        },
        page.locator(".ant-table-tbody"),
      );

      await step(
        "步骤2: 新建 quality_test_num 规则集并添加且关系校验包 → Step2 打开，规则包显示且关系校验包",
        async () => {
          await deleteRuleSetsByTableNames(page, ["quality_test_num"]);
          await createRuleSetDraft(page, "quality_test_num", [packageName]);
          await expect(
            page.locator(".ruleSetMonitor__package").filter({ hasText: packageName }).first(),
          ).toBeVisible({ timeout: 15000 });
        },
        page.locator(".ruleSetMonitor__package").filter({ hasText: packageName }).first(),
      );

      await step(
        "步骤3: 新增取值范围&枚举范围且关系规则并保存 → 规则保存成功，规则集列表显示 quality_test_num",
        async () => {
          const ruleForm = await addRuleToPackage(page, packageName);
          await configureRangeEnumRule(page, ruleForm, {
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

          await expect(ruleForm).toContainText("score");

          await saveRuleSet(page);
          await expect(getRuleSetListRow(page, "ruleset_15695_and")).toBeVisible({
            timeout: 10000,
          });
        },
        getRuleSetListRow(page, "ruleset_15695_and"),
      );
    });
  });
}
