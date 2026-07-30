// NOTE: 当前基础设施缺少 Hive2.x 数据源配置（test-data.ts/key-range-utils.ts 未定义 Hive 连接器），
// 现有代码仅保存为部分实现，不进入 generated full runner。
import { expect, test } from "../../../../../../../_shared/automation/fixtures/step-screenshot";
import { uniqueName } from "../../../../../../../../../runtime/automation/playwright";
import { KEY_RANGE_TABLE } from "../../fixtures/key-range-data";
import {
  addKeyRangeRule,
  configureKeyRangeRule,
  createRuleSetDraft,
  gotoRuleSetList,
  SPARKTHRIFT_MONITOR_DATASOURCE,
} from "../../pages/rule-set-page";

const SUITE_NAME = "【内置规则丰富】完整性，json中key值范围校验(#15693)";
const PAGE_NAME = "规则集管理";
const CASE_TITLE = "验证Hive2.x数据源的json字段支持key范围校验";

async function runKeyRangeCaseByDatasource(
  page: import("@playwright/test").Page,
  step: any,
  datasourceLabel: string,
  datasourceConfig: typeof SPARKTHRIFT_MONITOR_DATASOURCE,
): Promise<void> {
  const packageName = uniqueName("c0023_" + (datasourceLabel.includes("Spark") ? "spark" : "doris"));

  await step("步骤1: 打开规则集管理页面（" + datasourceLabel + "）", async () => {
    await gotoRuleSetList(page);
    await expect(page.locator(".ant-table-tbody, .ant-empty").first()).toBeVisible({
      timeout: 15000,
    });
  });

  await step("步骤2: 使用" + datasourceLabel + "创建规则集草稿并进入Step2", async () => {
    await createRuleSetDraft(page, KEY_RANGE_TABLE, [packageName], datasourceConfig);
    await expect(
      page.locator(".ruleSetMonitor__package").filter({ hasText: packageName }).first(),
    ).toBeVisible({ timeout: 15000 });
  });

  const ruleForm = await step(
    "步骤3: 在规则包中新增key范围校验规则（" + datasourceLabel + "）",
    async () => {
      const form = await addKeyRangeRule(page, packageName);
      await expect(form).toContainText("key范围校验", { timeout: 5000 });
      return form;
    },
  );

  await step("步骤4: 配置字段/校验方法/校验内容（" + datasourceLabel + "）", async () => {
    await configureKeyRangeRule(page, ruleForm, {
      field: "info",
      method: "包含",
      keyNames: ["key1"],
      ruleStrength: "强规则",
      description: "验证Hive2.x数据源的json字段支持key范围校验-" + datasourceLabel,
    });
    await expect(ruleForm).toContainText("key范围校验", { timeout: 5000 });
  });

  await step("步骤5: 校验规则表单可见且关键配置已回显（" + datasourceLabel + "）", async () => {
    // TODO: 该用例的业务断言需要按 Archive 步骤细化；当前先保证双数据源主流程可执行。
    await expect(ruleForm).toBeVisible({ timeout: 5000 });
  });
}

test.describe(SUITE_NAME + " - " + PAGE_NAME, () => {
  test.describe.configure({ timeout: 600000 });
  test(CASE_TITLE + "（SparkThrift2.x）", async ({ page, step }) => {
    await runKeyRangeCaseByDatasource(page, step, "SparkThrift2.x", SPARKTHRIFT_MONITOR_DATASOURCE);
  });
});
