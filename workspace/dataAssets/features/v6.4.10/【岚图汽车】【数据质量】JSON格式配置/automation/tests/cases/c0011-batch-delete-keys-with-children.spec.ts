// spec: features/json-config-helper/archive.md#case=t11-key
// intent: SR-INTENT-MIGRATED
// probe: SR-UI-PROBE-MIGRATED
// META: {"id":"t11","priority":"P1","title":"【P1】验证批量删除多条key（含子层级）"}
import { expect, test } from "../../../../../../_shared/automation/fixtures/step-screenshot";
import {
  addChildKey,
  addKey,
  clearSearch,
  deleteKey,
  gotoJsonConfigPage,
  searchKey,
} from "../../../../../../_shared/automation/pages/data-quality/json-configuration";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function rowsByExactKey(page: import("@playwright/test").Page, key: string) {
  return page.locator(".ant-table-row").filter({
    has: page
      .locator(".json-format-check__key-text")
      .filter({ hasText: new RegExp(`^${escapeRegExp(key)}$`) }),
  });
}

function rowByExactKey(page: import("@playwright/test").Page, key: string) {
  return rowsByExactKey(page, key).first();
}

test.describe("【通用配置】json格式配置 - 通用配置-json格式校验管理", () => {
  test("【P1】验证批量删除多条key（含子层级）", async ({ page, step }) => {
    const sharedPrefix = `batchDel_${Date.now()}`;
    const batchKey1 = `${sharedPrefix}_k1`;
    const batchKey1Child = `${sharedPrefix}_k1c`;
    const batchKey2 = `${sharedPrefix}_k2`;

    try {
      // 前置：创建 batchKey1 及其子层级、batchKey2
      await step(
        "步骤0: 新增 batchKey1（含子层级 batchKey1Child）和 batchKey2 → 前置数据准备完成",
        async () => {
          await gotoJsonConfigPage(page);
          await addKey(page, batchKey1);
          const key1Row = rowByExactKey(page, batchKey1);
          let key1Ready = false;
          for (let attempt = 1; attempt <= 3; attempt++) {
            await searchKey(page, batchKey1);
            key1Ready = await key1Row.isVisible({ timeout: 5000 }).catch(() => false);
            if (key1Ready) {
              break;
            }
            await gotoJsonConfigPage(page);
          }
          expect(key1Ready).toBe(true);
          await addChildKey(page, batchKey1, batchKey1Child);
          await addKey(page, batchKey2);
        },
      );

      // 步骤1：刷新页面，分别搜索两条记录，确认前置数据已可查询
      const table = page.locator(".ant-table");
      await step(
        "步骤1: 进入【数据质量 → 通用配置】页面，等待列表加载完成 → json格式校验管理页面打开，列表显示已有key数据",
        async () => {
          const ensureKeyVisible = async (keyName: string) => {
            let visible = false;
            const keyRow = rowByExactKey(page, keyName);
            for (let attempt = 1; attempt <= 3; attempt++) {
              await searchKey(page, keyName);
              visible = await keyRow.isVisible({ timeout: 5000 }).catch(() => false);
              if (visible) {
                break;
              }
            }
            expect(visible).toBe(true);
          };

          for (let attempt = 1; attempt <= 2; attempt++) {
            await gotoJsonConfigPage(page);
            await table.waitFor({ state: "visible", timeout: 15000 });
            try {
              await ensureKeyVisible(batchKey1);
              await ensureKeyVisible(batchKey2);
              break;
            } catch (error) {
              if (attempt === 2) {
                throw error;
              }
            }
          }
        },
        table,
      );

      // 步骤2：用共同前缀筛出两条父级记录并勾选，断言批量操作栏出现
      const batchDeleteBtn = page.getByRole("button", { name: /^批量删除$/ });
      await step(
        "步骤2: 在列表中勾选 batchKey1 和 batchKey2 两行的行选择框 → 两行均显示勾选状态，列表上方出现批量操作栏",
        async () => {
          await page
            .locator(".ant-spin-spinning")
            .waitFor({ state: "hidden", timeout: 10000 })
            .catch(() => undefined);

          await searchKey(page, sharedPrefix);

          const key1Row = rowByExactKey(page, batchKey1);
          await expect(key1Row).toBeVisible({ timeout: 10000 });
          await key1Row.locator(".ant-checkbox-input, .ant-checkbox input").check({ force: true });
          await expect(key1Row.locator(".ant-checkbox-checked")).toBeVisible({ timeout: 5000 });

          const key2Row = rowByExactKey(page, batchKey2);
          await expect(key2Row).toBeVisible({ timeout: 10000 });
          await key2Row.locator(".ant-checkbox-input, .ant-checkbox input").check({ force: true });
          await expect(key2Row.locator(".ant-checkbox-checked")).toBeVisible({ timeout: 5000 });

          await expect(batchDeleteBtn).toBeVisible({ timeout: 5000 });
        },
        batchDeleteBtn,
      );

      // 步骤3：点击【批量删除】按钮，断言确认 Modal 弹出
      const confirmModal = page
        .locator(".ant-modal-confirm:visible, .ant-modal:visible")
        .filter({ hasText: /批量删除key信息|联动删除/ })
        .last();
      await step(
        "步骤3: 点击【批量删除】按钮 → 弹出确认弹窗，提示文本为「是否批量删除key信息?」",
        async () => {
          await page
            .locator(".ant-spin-spinning")
            .waitFor({ state: "hidden", timeout: 10000 })
            .catch(() => undefined);
          await batchDeleteBtn.click();

          await expect(confirmModal).toBeVisible({ timeout: 10000 });
          await expect(confirmModal).toContainText(/联动删除|子层级/, { timeout: 5000 });
        },
      );

      // 步骤4：点击确认弹窗内"删 除"按钮，等待响应，断言两条记录消失
      await step(
        "步骤4: 点击确认弹窗中的【删除】按钮，等待接口响应完成 → 弹窗关闭，batchKey1、batchKey2 均从列表消失，batchKey1Child 也不再存在",
        async () => {
          const deleteDone = page.waitForResponse(
            (response) =>
              response.url().includes("/jsonValidationConfig/deleteBatch") &&
              response.request().method() === "POST",
            { timeout: 30000 },
          );
          await confirmModal.locator(".ant-btn-primary").first().click();
          await deleteDone;
          await confirmModal.waitFor({ state: "hidden", timeout: 10000 }).catch(() => undefined);

          await searchKey(page, batchKey1);
          await expect(rowsByExactKey(page, batchKey1)).toHaveCount(0, { timeout: 10000 });
          await searchKey(page, batchKey2);
          await expect(rowsByExactKey(page, batchKey2)).toHaveCount(0, { timeout: 10000 });
          await searchKey(page, batchKey1Child);
          await expect(rowsByExactKey(page, batchKey1Child)).toHaveCount(0, { timeout: 10000 });
        },
        table,
      );
    } finally {
      await clearSearch(page).catch(() => undefined);
      await deleteKey(page, batchKey1).catch(() => undefined);
      await deleteKey(page, batchKey2).catch(() => undefined);
    }
  });
});
