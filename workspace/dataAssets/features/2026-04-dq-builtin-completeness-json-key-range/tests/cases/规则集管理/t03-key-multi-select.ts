// spec: features/2026-04-wan-zheng-xing-json-key/archive.md#case=t03-key-multi-select
// intent: SR-INTENT-MIGRATED
// probe: SR-UI-PROBE-MIGRATED
// page: _shared/pages/PLACEHOLDER-page.ts
// META: {"id":"t3","priority":"P1","title":"【P1】验证校验内容支持多选和全选操作"}
import { expect, test } from "../../../../../_shared/fixtures/step-screenshot";
import { selectAntOption } from "../../../../../_shared/helpers";
import { addRuleToPackage } from "../../../../../_shared/pages/2026-04-you-xiao-xing-duo-gui-ze/rule-editor-helpers";
import {
  ACTIVE_DATASOURCES,
  clearCurrentDatasource,
  setCurrentDatasource,
} from "../../data/test-data";
import {
  KEY_RANGE_RULE_NAME,
  SCENARIOS,
  selectRuleFunction,
  setVerificationContent,
  startRuleSetDraft,
} from "../../../../../_shared/pages/2026-04-wan-zheng-xing-json-key/suite-helpers";

/**
 * Open the verification content TreeSelect dropdown and expand all tree nodes.
 */
async function openContentDropdown(
  page: import("@playwright/test").Page,
  ruleForm: import("@playwright/test").Locator,
): Promise<import("@playwright/test").Locator> {
  await page.keyboard.press("Escape").catch(() => undefined);
  await page.waitForTimeout(300);

  const contentFormItem = ruleForm
    .locator(".ant-form-item")
    .filter({ hasText: /校验内容/ })
    .first();
  const trigger = contentFormItem.locator(".ant-select, .ant-tree-select").first();
  await trigger.locator(".ant-select-selector").first().click({ timeout: 5000 });
  await page.waitForTimeout(500);

  const dropdown = page.locator(".ant-tree-select-dropdown:visible").last();
  await dropdown.waitFor({ state: "visible", timeout: 10000 });

  // Expand tree nodes
  const treeList = dropdown.locator(".ant-select-tree-list").first();
  const treeNodeCount = await treeList.locator(".ant-select-tree-treenode").count();
  if (treeNodeCount > 30) return dropdown;

  for (let pass = 0; pass < 3; pass++) {
    const switchers = treeList.locator(".ant-select-tree-switcher");
    const count = await switchers.count();
    if (count === 0 || count > 20) break;
    let expandedAny = false;
    for (let i = 0; i < count; i++) {
      const switcher = switchers.nth(i);
      const visible = await switcher.isVisible({ timeout: 200 }).catch(() => false);
      if (!visible) continue;
      const cls = (await switcher.getAttribute("class")) ?? "";
      if (cls.includes("close")) {
        await switcher.click({ force: true }).catch(() => undefined);
        await page.waitForTimeout(200);
        expandedAny = true;
      }
    }
    if (!expandedAny) break;
  }
  return dropdown;
}

/**
 * Get the tree node locator for a key name.
 */
function getTreeNode(
  dropdown: import("@playwright/test").Locator,
  keyName: string,
): import("@playwright/test").Locator {
  const title = dropdown.locator(".ant-select-tree-title").filter({ hasText: keyName }).first();
  return title.locator("xpath=ancestor::*[contains(@class,'ant-select-tree-treenode')][1]");
}

/**
 * Click the tree node checkbox.
 */
async function clickKeyCheckbox(
  dropdown: import("@playwright/test").Locator,
  keyName: string,
): Promise<void> {
  const checkbox = getTreeNode(dropdown, keyName).locator(".ant-select-tree-checkbox").first();
  await checkbox.click({ force: true });
}

/**
 * Check if a key is effectively selected (checked or disabled from master).
 */
async function expectKeySelected(
  dropdown: import("@playwright/test").Locator,
  keyName: string,
  selected: boolean,
): Promise<void> {
  const treeNode = getTreeNode(dropdown, keyName);
  await expect(treeNode).toBeVisible({ timeout: 3000 });
  const cls = await treeNode.getAttribute("class");
  const isSelected =
    (cls?.includes("ant-select-tree-treenode-checkbox-checked") ?? false) ||
    (cls?.includes("ant-select-tree-treenode-disabled") ?? false);
  expect(isSelected).toBe(selected);
}

for (const datasource of ACTIVE_DATASOURCES) {
  test.describe(`${"【内置规则丰富】完整性，json中key值范围校验 - 规则集管理"} - ${datasource.reportName}`, () => {
    test.describe.configure({ timeout: 600000 });
    test.beforeAll(() => setCurrentDatasource(datasource));
    test.beforeEach(() => setCurrentDatasource(datasource));
    test.afterAll(() => clearCurrentDatasource());

    test("验证校验内容支持多选和全选操作", async ({ page, step }) => {
      let ruleForm: import("@playwright/test").Locator;

      await step(
        "步骤1: 新建规则集草稿并配置key范围校验 → 表单加载完成",
        async () => {
          await startRuleSetDraft(page, SCENARIOS.main);
          ruleForm = await addRuleToPackage(page, SCENARIOS.main.packageName, "完整性校验");
          const levelSelect = ruleForm
            .locator(".ant-form-item")
            .filter({ hasText: /规则类型/ })
            .locator(".ant-select")
            .first();
          await selectAntOption(page, levelSelect, /字段级|字段/);
          const fieldSelect = ruleForm
            .locator(".ant-form-item")
            .filter({ hasText: /^字段/ })
            .locator(".ant-select")
            .first();
          await selectAntOption(page, fieldSelect, "info");
          await selectRuleFunction(ruleForm, KEY_RANGE_RULE_NAME);
          const methodSelect = ruleForm
            .locator(".ant-form-item")
            .filter({ hasText: /校验方法/ })
            .locator(".ant-select")
            .first();
          await selectAntOption(page, methodSelect, "包含");
          await expect(ruleForm).toContainText("key范围校验");
        },
        ruleForm!,
      );

      await step("步骤2: 打开校验内容下拉框并展开 → 显示全部key选项", async () => {
        const dropdown = await openContentDropdown(page, ruleForm!);
        await expect(dropdown).toBeVisible({ timeout: 5000 });
        for (const name of ["key1", "key2", "key3", "全部"]) {
          await expect(
            dropdown.locator(".ant-select-tree-title").filter({ hasText: name }).first(),
          ).toBeVisible({ timeout: 3000 });
        }
      });

      await step("步骤3: 依次勾选key1、key2、key3 → 三组key呈选中状态", async () => {
        const dropdown = page.locator(".ant-tree-select-dropdown:visible").last();
        await dropdown.waitFor({ state: "visible", timeout: 5000 });
        for (const keyName of ["key1", "key2", "key3"]) {
          await clickKeyCheckbox(dropdown, keyName);
          await page.waitForTimeout(200);
          await expectKeySelected(dropdown, keyName, true);
        }
      });

      await step("步骤4: 点击【全部】→ 全部6个key被勾选，全部选项呈全选状态", async () => {
        const dropdown = page.locator(".ant-tree-select-dropdown:visible").last();
        const allCheckbox = getTreeNode(dropdown, "全部")
          .locator(".ant-select-tree-checkbox")
          .first();
        const allCls = await allCheckbox.getAttribute("class");
        if (!(allCls?.includes("ant-select-tree-checkbox-checked") ?? false)) {
          await allCheckbox.click({ force: true });
          await page.waitForTimeout(300);
        }
        await expect(allCheckbox).toHaveClass(/ant-select-tree-checkbox-checked/, {
          timeout: 3000,
        });
        for (const name of ["key1", "key2", "key3", "key11", "key22", "key33"]) {
          await expectKeySelected(dropdown, name, true);
        }
      });

      await step("步骤5: 再次点击【全部】→ 所有key取消勾选", async () => {
        const dropdown = page.locator(".ant-tree-select-dropdown:visible").last();
        const allCheckbox = getTreeNode(dropdown, "全部")
          .locator(".ant-select-tree-checkbox")
          .first();
        const allCls = await allCheckbox.getAttribute("class");
        if (allCls?.includes("ant-select-tree-checkbox-checked") ?? false) {
          await allCheckbox.click({ force: true });
          await page.waitForTimeout(300);
        }
        await expect(allCheckbox).not.toHaveClass(/ant-select-tree-checkbox-checked/, {
          timeout: 3000,
        });
        for (const name of ["key1", "key2", "key3", "key11", "key22", "key33"]) {
          await expectKeySelected(dropdown, name, false);
        }
      });

      await step(
        "步骤6: 使用setVerificationContent选中key1和key11并确认 → 回显key1;key11",
        async () => {
          // Close any open dropdown first
          await page.keyboard.press("Escape").catch(() => undefined);
          await page.waitForTimeout(300);

          // Use the proven helper to set verification content
          await setVerificationContent(page, ruleForm!, ["key1", "key11"]);

          // Verify in the content form item's selection display
          const contentItem = ruleForm!
            .locator(".ant-form-item")
            .filter({ hasText: /校验内容/ })
            .first();
          await expect(contentItem).toContainText("key1");
          await expect(contentItem).toContainText("key11");
        },
        ruleForm!,
      );
    });
  });
}
