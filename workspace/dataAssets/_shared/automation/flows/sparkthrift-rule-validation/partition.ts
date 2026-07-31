import { expect, type Page } from "@playwright/test";

import {
  chooseDqFieldOptionByText,
  escapeRegExp,
} from "../../pages/data-quality/form-controls";

export async function configureExistingPartition(
  page: Page,
  sourceRef: string,
  expectedPartition: string,
): Promise<void> {
  const existingPartitionRadio = page.getByRole("radio", { name: "选择已有分区" });
  if (!(await existingPartitionRadio.isChecked({ timeout: 3000 }).catch(() => false))) {
    await chooseDqFieldOptionByText(page, /分区方式|选择分区|分区/, "选择已有分区", sourceRef);
  }
  for (const token of expectedPartition.split(",").map((item) => item.trim())) {
    const value = token.includes("=")
      ? token.split("=").slice(1).join("=").replace(/^'|'$/g, "")
      : token;
    await selectPartitionValue(page, value, sourceRef);
  }
  await expect(page.locator("body"), `${sourceRef}: 分区配置应回显目标已有分区`).toContainText(
    new RegExp(
      expectedPartition
        .split(/[=,'"\s]+/)
        .filter((token) => token.length >= 2)
        .map(escapeRegExp)
        .join("|"),
    ),
    { timeout: 30000 },
  );
}

async function selectPartitionValue(page: Page, value: string, sourceRef: string): Promise<void> {
  const partitionSelect = page
    .locator(".ant-form-item, .ant-row, label")
    .filter({ hasText: /分区|stat_date|hour/ })
    .locator(".ant-select")
    .last();
  if (await partitionSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
    await partitionSelect.click({ timeout: 30000 });
    await page.keyboard.type(value);
    const dropdown = page.locator(".ant-select-dropdown:visible").last();
    await expect(dropdown, `${sourceRef}: 分区下拉应包含「${value}」`).toContainText(value, {
      timeout: 30000,
    });
    await dropdown.getByText(value, { exact: false }).first().click({ timeout: 30000 });
    return;
  }

  const input = page.locator("input").filter({ hasText: "" }).last();
  await input.fill(value, { timeout: 30000 });
}
