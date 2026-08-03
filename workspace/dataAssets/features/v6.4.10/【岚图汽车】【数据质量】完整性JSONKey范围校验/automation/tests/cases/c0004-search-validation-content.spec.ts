import { selectAntOption, waitForUiSettled } from "../../../../../../../../runtime/automation/playwright";
// spec: features/completeness-json-key-range/archive.md#case=t04-search-verify-content
// intent: SR-INTENT-MIGRATED
// probe: SR-UI-PROBE-MIGRATED
// META: {"id":"t4","priority":"P1","title":"验证校验内容下拉框支持输入关键词搜索查询"}
import { expect, test } from "../../../../../../_shared/automation/fixtures/step-screenshot";
import { addRuleToPackage } from "../../../../../../_shared/automation/pages/data-quality/rule-set-editor";
import {
  ACTIVE_DATASOURCES,
  clearCurrentDatasource,
  setCurrentDatasource,
} from "../fixtures/test-data";
import {
  SCENARIOS,
  selectRuleFunction,
  startRuleSetDraft,
} from "../flows/rule-set-flow";

test.setTimeout(600000);

for (const datasource of ACTIVE_DATASOURCES) {
  test.describe(`${"【内置规则丰富】完整性，json中key值范围校验 - 校验内容搜索"} - ${datasource.reportName}`, () => {
    test.beforeAll(() => setCurrentDatasource(datasource));
    test.beforeEach(() => setCurrentDatasource(datasource));
    test.afterAll(() => clearCurrentDatasource());

    test("验证校验内容下拉框支持输入关键词搜索查询", async ({ page, step }) => {
      await step("步骤1: 进入规则集管理页面并打开编辑器 → 规则集编辑页正常打开", async () => {
        await startRuleSetDraft(page, SCENARIOS.main);
        const ruleForm = await addRuleToPackage(page, SCENARIOS.main.packageName, "完整性校验");

        // 选择字段级规则类型
        const levelSelect = ruleForm
          .locator(".ant-form-item")
          .filter({ hasText: /规则类型/ })
          .locator(".ant-select")
          .first();
        await selectAntOption(page, levelSelect, /字段级|字段/);

        // 选择统计函数：key范围校验
        await selectRuleFunction(ruleForm, "key范围校验");
        await waitForUiSettled(page);

        // 选择字段：info
        const fieldFormItem = ruleForm
          .locator(".ant-form-item")
          .filter({ hasText: /字段/ })
          .first();
        await selectAntOption(page, fieldFormItem.locator(".ant-select").first(), "info");
        await waitForUiSettled(page);

        // 选择校验方法：包含
        const functionRow = ruleForm.locator(".rule__function-list__item").first();
        const methodSelects = functionRow.locator(".ant-select:not(.ant-tree-select)");
        const methodSelectCount = await methodSelects.count();
        await selectAntOption(page, methodSelects.nth(methodSelectCount > 1 ? 1 : 0), "包含");
        await waitForUiSettled(page);
      });

      await step(
        "步骤2: 打开校验内容下拉框 → TreeSelect 下拉框展开并显示所有 key 选项",
        async () => {
          const ruleForm = page.locator(".ruleForm").first();
          const treeSelectTrigger = ruleForm
            .locator(".ant-select.ant-tree-select, .ant-tree-select")
            .first();
          await treeSelectTrigger.click();
          await waitForUiSettled(page);

          const dropdown = page
            .locator(
              ".ant-tree-select-dropdown:visible, .ant-select-dropdown:visible .ant-select-tree-list",
            )
            .first();
          await expect(dropdown).toBeVisible({ timeout: 10000 });

          // 展开所有树节点
          for (let pass = 0; pass < 3; pass++) {
            const switchers = dropdown.locator(".ant-select-tree-switcher, .ant-tree-switcher");
            const count = await switchers.count().catch(() => 0);
            let expandedAny = false;
            for (let i = 0; i < count; i++) {
              const sw = switchers.nth(i);
              if (!(await sw.isVisible({ timeout: 500 }).catch(() => false))) {
                continue;
              }
              const cls = (await sw.getAttribute("class")) ?? "";
              if (/open|noop/.test(cls)) continue;
              await sw.scrollIntoViewIfNeeded().catch(() => undefined);
              await sw.click({ force: true }).catch(async () => {
                await sw.evaluate((node) => (node as HTMLElement).click());
              });
              await waitForUiSettled(page);
              expandedAny = true;
            }
            if (!expandedAny) break;
          }
        },
      );

      await step('步骤3: 搜索"key1" → 下拉列表过滤显示包含"key1"的结果', async () => {
        const ruleForm = page.locator(".ruleForm").first();
        const treeSelectTrigger = ruleForm
          .locator(".ant-select.ant-tree-select, .ant-tree-select")
          .first();
        const dropdown = page
          .locator(
            ".ant-tree-select-dropdown:visible, .ant-select-dropdown:visible .ant-select-tree-list",
          )
          .first();

        // 若下拉框未打开则重新打开
        if (!(await dropdown.isVisible({ timeout: 1000 }).catch(() => false))) {
          await treeSelectTrigger.click();
          await dropdown.waitFor({ state: "visible", timeout: 5000 });
        }

        const searchInput = dropdown.locator("input").first();
        await expect(searchInput).toBeVisible({ timeout: 5000 });
        await searchInput.fill("key1");
        await waitForUiSettled(page);

        // 断言：所有可见选项都包含"key1"
        const options = dropdown.locator(
          ".ant-select-tree-title, .ant-select-tree-node-content-wrapper, .ant-select-item-option-content",
        );
        const visibleCount = await options.count();
        expect(visibleCount).toBeGreaterThan(0);
        for (let i = 0; i < visibleCount; i++) {
          const text = await options.nth(i).textContent();
          expect(text?.trim()).toContain("key1");
        }
      });

      await step('步骤4: 搜索"省份" → 下拉列表过滤显示包含"省份"的结果', async () => {
        const ruleForm = page.locator(".ruleForm").first();
        const treeSelectTrigger = ruleForm
          .locator(".ant-select.ant-tree-select, .ant-tree-select")
          .first();
        const dropdown = page
          .locator(
            ".ant-tree-select-dropdown:visible, .ant-select-dropdown:visible .ant-select-tree-list",
          )
          .first();

        if (!(await dropdown.isVisible({ timeout: 1000 }).catch(() => false))) {
          await treeSelectTrigger.click();
          await dropdown.waitFor({ state: "visible", timeout: 5000 });
        }

        const searchInput = dropdown.locator("input").first();
        await searchInput.fill("省份");
        await waitForUiSettled(page);

        const options = dropdown.locator(
          ".ant-select-tree-title, .ant-select-tree-node-content-wrapper, .ant-select-item-option-content",
        );
        const visibleCount = await options.count();
        expect(visibleCount).toBeGreaterThan(0);
        for (let i = 0; i < visibleCount; i++) {
          const text = await options.nth(i).textContent();
          expect(text?.trim()).toContain("省份");
        }
      });

      await step('步骤5: 搜索"xyz_not_exist" → 下拉列表显示"暂无数据"', async () => {
        const ruleForm = page.locator(".ruleForm").first();
        const treeSelectTrigger = ruleForm
          .locator(".ant-select.ant-tree-select, .ant-tree-select")
          .first();
        const dropdown = page
          .locator(
            ".ant-tree-select-dropdown:visible, .ant-select-dropdown:visible .ant-select-tree-list",
          )
          .first();

        if (!(await dropdown.isVisible({ timeout: 1000 }).catch(() => false))) {
          await treeSelectTrigger.click();
          await dropdown.waitFor({ state: "visible", timeout: 5000 });
        }

        const searchInput = dropdown.locator("input").first();
        await searchInput.fill("xyz_not_exist");
        await waitForUiSettled(page);

        const emptyIndicator = dropdown
          .locator(".ant-select-tree-empty, .ant-select-item-empty, .ant-empty")
          .first();
        await expect(emptyIndicator).toBeVisible({ timeout: 5000 });
      });
    });
  });
}
