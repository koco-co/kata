// spec: features/2026-04-tong-yong-j-s/archive.md#case=t07-key-value
// intent: SR-INTENT-MIGRATED
// probe: SR-UI-PROBE-MIGRATED
// page: _shared/pages/PLACEHOLDER-page.ts
// META: {"id":"t7","priority":"P1","title":"【P1】验证编辑key名称、value格式、数据源类型并保存生效"}
import { expect, test } from "../../../../_shared/fixtures/step-screenshot";
import { uniqueName } from "../../../../_shared/helpers/test-setup";
import {
  addKey,
  clearSearch,
  deleteKey,
  gotoJsonConfigPage,
  searchKey,
  waitModal,
} from "../../../../_shared/pages/2026-04-tong-yong-j-s/json-config-helpers";

async function waitTableLoaded(page: import("@playwright/test").Page) {
  await page
    .locator(".ant-spin-spinning")
    .waitFor({ state: "hidden", timeout: 15000 })
    .catch(() => undefined);
  await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => undefined);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function rowByExactKey(page: import("@playwright/test").Page, key: string) {
  return page
    .locator(".ant-table-row")
    .filter({
      has: page
        .locator(".json-format-check__key-text")
        .filter({ hasText: new RegExp(`^${escapeRegExp(key)}$`) }),
    })
    .first();
}

test.describe("【通用配置】json格式配置 - 通用配置-json格式校验管理", () => {
  test("【P1】验证编辑key名称、value格式、数据源类型并保存生效", { tag: "@serial" }, async ({
    page,
    step,
  }) => {
    test.setTimeout(240000);
    const editTarget = uniqueName("editTarget");
    const editTargetV2 = uniqueName("editTargetV2");
    let beforeUpdateAt = "";

    try {
      await step(
        "步骤1: 进入【数据质量 → 通用配置】页面并准备 editTarget 数据 → 页面正常加载，列表显示 editTarget 记录",
        async () => {
          await gotoJsonConfigPage(page);
          await addKey(page, editTarget, {
            chineseName: "编辑前名称",
            valueFormat: "^[a-z]+$",
            dataSourceType: "SparkThrift2.x",
          });
          await searchKey(page, editTarget);
          const initialRow = rowByExactKey(page, editTarget);
          await expect(initialRow).toBeVisible({ timeout: 10000 });
          beforeUpdateAt =
            (await initialRow.locator(".ant-table-cell").nth(8).textContent())?.trim() ?? "";
          expect(beforeUpdateAt).not.toBe("");
        },
        rowByExactKey(page, editTarget),
      );

      await step(
        "步骤2: 在 editTarget 行点击【编辑】 → 弹出编辑弹窗，key/value格式/数据源类型显示当前值",
        async () => {
          const targetRow = rowByExactKey(page, editTarget);
          await expect(targetRow).toBeVisible({ timeout: 10000 });
          await targetRow.locator(".ant-btn-link").filter({ hasText: "编辑" }).click();

          const modal = await waitModal(page, "编辑");
          await expect(modal.locator("input#jsonKey").first()).toHaveValue(editTarget, {
            timeout: 5000,
          });
          await expect(modal.locator("input#value").first()).toHaveValue("^[a-z]+$", {
            timeout: 5000,
          });
          await expect(
            modal
              .locator(".ant-form-item")
              .filter({ hasText: "数据源类型" })
              .locator(".ant-select-selection-item"),
          ).toContainText("SparkThrift2.x", { timeout: 5000 });
        },
      );

      await step("步骤3: 修改 key、数据源类型并点击【确定】 → 弹窗关闭", async () => {
        // 步骤2结束时弹窗仍然打开，这里继续在同一弹窗里操作
        const modal = await waitModal(page, "编辑");
        const keyInput = modal.locator("input#jsonKey").first();

        // 先改 key 名称
        await keyInput.fill(editTargetV2);
        await expect(keyInput).toHaveValue(editTargetV2, { timeout: 5000 });

        // 先改数据源类型。该 Select 会触发弹窗局部重渲染，value 输入框后续重新定位再填写。
        const dataSourceSelect = modal
          .locator(".ant-form-item")
          .filter({ hasText: "数据源类型" })
          .locator(".ant-select")
          .first();
        await dataSourceSelect.locator(".ant-select-selector").click();
        await page
          .locator(".ant-select-dropdown:visible .ant-select-item-option")
          .filter({ hasText: "Doris3.x" })
          .first()
          .click();
        await expect(
          modal
            .locator(".ant-form-item")
            .filter({ hasText: "数据源类型" })
            .locator(".ant-select-selection-item"),
        ).toContainText("Doris3.x", { timeout: 5000 });

        const updateResponse = page.waitForResponse(
          (response) =>
            response.url().includes("/jsonValidationConfig/update") &&
            response.request().method() === "POST",
          { timeout: 30000 },
        );
        await modal.getByRole("button", { name: /^确\s*定$/ }).click();
        await updateResponse;
        await modal.waitFor({ state: "hidden", timeout: 15000 });
        await waitTableLoaded(page);
      });

      await step("步骤3-补充: 再次编辑 value格式并点击【确定】 → value格式保存生效", async () => {
        await searchKey(page, editTargetV2);
        const updatedKeyRow = rowByExactKey(page, editTargetV2);
        await expect(updatedKeyRow).toBeVisible({ timeout: 10000 });
        await expect(updatedKeyRow.locator(".ant-table-cell").nth(4)).toHaveText("Doris3.x");
        await updatedKeyRow.locator(".ant-btn-link").filter({ hasText: "编辑" }).click();

        const modal = await waitModal(page, "编辑");
        const valueInput = modal.locator("input#value").first();
        await valueInput.fill("^\\d{4}$");
        await expect(valueInput).toHaveValue("^\\d{4}$", { timeout: 5000 });
        await valueInput.blur();

        // 列表更新时间精度为秒，保证第二次保存和前置创建时间可区分。
        await page.waitForTimeout(1100);
        const updateResponse = page.waitForResponse(
          (response) =>
            response.url().includes("/jsonValidationConfig/update") &&
            response.request().method() === "POST",
          { timeout: 30000 },
        );
        await modal.getByRole("button", { name: /^确\s*定$/ }).click();
        await updateResponse;
        await modal.waitFor({ state: "hidden", timeout: 15000 });
        await waitTableLoaded(page);
      });

      await step(
        "步骤4: 搜索 editTargetV2 → 列表显示更新后的key、value格式、数据源类型、更新人和更新时间",
        async () => {
          await searchKey(page, editTargetV2);
          const updatedRow = rowByExactKey(page, editTargetV2);
          await expect(updatedRow).toBeVisible({ timeout: 10000 });
          await expect(updatedRow.locator(".ant-table-cell").nth(1)).toHaveText(editTargetV2);
          await expect(updatedRow.locator(".ant-table-cell").nth(2)).toHaveText("编辑前名称");
          await expect(updatedRow.locator(".ant-table-cell").nth(3)).toHaveText("^\\d{4}$");
          await expect(updatedRow.locator(".ant-table-cell").nth(4)).toHaveText("Doris3.x");
          await expect(updatedRow.locator(".ant-table-cell").nth(7)).toHaveText(
            "admin@dtstack.com",
          );

          const updatedAt =
            (await updatedRow.locator(".ant-table-cell").nth(8).textContent())?.trim() ?? "";
          expect(updatedAt).not.toBe("");
          expect(updatedAt).not.toBe(beforeUpdateAt);
        },
        rowByExactKey(page, editTargetV2),
      );

      await step("步骤5: 搜索原 key editTarget → 原记录不存在", async () => {
        await searchKey(page, editTarget);
        await expect(rowByExactKey(page, editTarget)).toHaveCount(0);
      });
    } finally {
      await clearSearch(page).catch(() => undefined);
      await deleteKey(page, editTargetV2).catch(() => undefined);
      await deleteKey(page, editTarget).catch(() => undefined);
    }
  });
});
