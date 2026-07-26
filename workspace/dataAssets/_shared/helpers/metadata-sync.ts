import { waitForUiSettled } from "../../../../lib/playwright/index";
// metadata-sync.ts — split from test-setup.ts

import type { Locator, Page } from "@playwright/test";

import { applyRuntimeCookies, buildDataAssetsUrl } from "./env-setup";

type RuntimeEnv = Record<string, string | undefined>;
type ProjectListResponse = { data?: Array<{ id?: number | string }> };
type SyncMetadataOptions = {
  requireExactTable?: boolean;
  allowFilterFallbackForExactTable?: boolean;
};

/**
 * 创建并执行元数据同步任务（周期同步 + 临时同步）
 *
 * 实际弹窗结构（来自 page snapshot）:
 *   - "* 数据源" 单选 combobox
 *   - 表格行: 数据库(combobox) | 数据表(combobox) | 数据表过滤 | 操作
 *   - 底部按钮: 取消 | 临时同步 | 下一步
 *
 * @param datasourceName 数据源名称（如含 Doris 的数据源）
 */
export async function syncMetadata(
  page: Page,
  datasourceName?: string,
  database?: string,
  tableName?: string,
  options: SyncMetadataOptions = {},
): Promise<void> {
  const requireExactTable = options.requireExactTable ?? process.env.METADATA_SYNC_REQUIRE_EXACT_TABLE === "true";
  const allowFilterFallbackForExactTable = options.allowFilterFallbackForExactTable ?? false;
  let selectedSyncTableName: string | undefined;
  const readSyncErrorText = async (): Promise<string> => {
    const bodyText = await page
      .locator("body")
      .innerText()
      .catch(() => "");
    return bodyText.replace(/\s+/g, " ").trim();
  };
  const chooseDropdownOption = async (option: string, label: string, combobox?: Locator): Promise<boolean> => {
    let lastDropdownText = "";
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      if (combobox) {
        await combobox.locator(".ant-select-selector").click({ timeout: 30_000 });
      }
      await waitForUiSettled(page);
      await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A").catch(() => {});
      await page.keyboard.type(option).catch(() => {});
      await waitForUiSettled(page);
      const dropdown = page.locator(".ant-select-dropdown:visible").last();
      lastDropdownText = ((await dropdown.innerText({ timeout: 1000 }).catch(() => "")) ?? "").replace(/\s+/g, " ");
      const exact = dropdown
        .locator(".ant-select-item-option:not(.ant-select-item-option-disabled)")
        .filter({ hasText: new RegExp(`^\\s*${escapeRegExp(option)}\\s*$`, "i") })
        .first();
      if (await exact.isVisible({ timeout: 3000 }).catch(() => false)) {
        await exact.click();
        return true;
      }
      const fuzzy = dropdown
        .locator(".ant-select-item-option:not(.ant-select-item-option-disabled)")
        .filter({ hasText: new RegExp(escapeRegExp(option), "i") })
        .first();
      if (await fuzzy.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fuzzy.click();
        return true;
      }
      await page.keyboard.press("Escape").catch(() => {});
      await waitForUiSettled(page);
    }
    throw new Error(`Failed to select metadata ${label} ${option}; dropdown=${lastDropdownText}: ${await readSyncErrorText()}`);
  };

  // 导航到元数据同步
  await applyRuntimeCookies(page);
  await page.goto(buildDataAssetsUrl("/metaDataSync"));
  await waitForUiSettled(page);
  await waitForUiSettled(page);

  if (datasourceName && database && tableName) {
    const existingSyncRow = await findExistingSyncRow(page, datasourceName, database, tableName);
    if (existingSyncRow) {
      const existingText = ((await existingSyncRow.innerText({ timeout: 5000 }).catch(() => "")) ?? "").replace(/\s+/g, " ");
      if (/同步完成/.test(existingText)) return;
      if (/同步中|运行中|进行中|等待|初始化/.test(existingText)) {
        await waitForSyncListCompletion(page, datasourceName, database, tableName);
        return;
      }
    }
  }

  // 点击新增周期同步任务
  const addBtn = page
    .getByRole("button", { name: /新增周期同步任务/ })
    .or(page.locator("button").filter({ hasText: /新增.*同步/ }))
    .first();
  await addBtn.click();
  await waitForUiSettled(page);

  // 等待弹窗出现
  const modal = page.locator(".ant-modal:visible, dialog:visible").first();
  await modal.waitFor({ state: "visible", timeout: 10000 });

  // 选择数据源（弹窗中的第一个 combobox: "* 数据源"）
  if (datasourceName) {
    const dsCombobox = modal.locator(".ant-select").first();
    if (await dsCombobox.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dsCombobox.locator(".ant-select-selector").click();
      await waitForUiSettled(page);
      await chooseDropdownOption(datasourceName, "datasource", dsCombobox);
      await waitForUiSettled(page);
    }
  }

  // 选择数据库（表格行中的第一个 combobox）
  const dbCombobox = modal.locator(".ant-table-row .ant-select").first();
  if (await dbCombobox.isVisible({ timeout: 5000 }).catch(() => false)) {
    await dbCombobox.locator(".ant-select-selector").click();
    await waitForUiSettled(page);
    const dbOptions = page.locator(".ant-select-dropdown:visible .ant-select-item-option");
    if (database) {
      await chooseDropdownOption(database, "database", dbCombobox);
    } else {
      // 选第一个可用数据库
      const firstDb = dbOptions.first();
      if (!(await firstDb.isVisible({ timeout: 5000 }).catch(() => false))) {
        throw new Error(`No metadata database options are available: ${await readSyncErrorText()}`);
      }
      await firstDb.click();
    }
    await waitForUiSettled(page);
  }

  // 选择数据表（表格行中的第二个 combobox）
  const tableCombobox = modal.locator(".ant-table-row .ant-select").nth(1);
  if (await tableCombobox.isVisible({ timeout: 5000 }).catch(() => false)) {
    const trySelectComboboxValue = async (combobox: ReturnType<typeof modal.locator>, option: string, label: string): Promise<boolean> => {
      await combobox.locator(".ant-select-selector").click({ timeout: 30_000 });
      await waitForUiSettled(page);
      await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A").catch(() => {});
      await page.keyboard.type(option).catch(() => {});
      await waitForUiSettled(page);
      const dropdown = page.locator(".ant-select-dropdown:visible").last();
      const exact = dropdown
        .locator(".ant-select-item-option:not(.ant-select-item-option-disabled)")
        .filter({ hasText: new RegExp(`^\\s*${escapeRegExp(option)}\\s*$`, "i") })
        .first();
      if (await exact.isVisible({ timeout: 3000 }).catch(() => false)) {
        await exact.click();
        await waitForUiSettled(page);
        return true;
      }
      const fuzzy = dropdown
        .locator(".ant-select-item-option:not(.ant-select-item-option-disabled)")
        .filter({ hasText: new RegExp(escapeRegExp(option), "i") })
        .first();
      if (await fuzzy.isVisible({ timeout: 2000 }).catch(() => false)) {
        await fuzzy.click();
        await waitForUiSettled(page);
        return true;
      }
      await page.keyboard.press("Escape").catch(() => {});
      return false;
    };
    const selectAllTablesOption = async (combobox: ReturnType<typeof modal.locator>): Promise<boolean> => {
      await combobox.locator(".ant-select-selector").click({ timeout: 30_000 });
      const searchInput = combobox.locator("input.ant-select-selection-search-input, input[role='combobox']").first();
      if (await searchInput.count().catch(() => 0)) {
        await searchInput.focus().catch(() => {});
        await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A").catch(() => {});
        await page.keyboard.press("Backspace").catch(() => {});
      }
      await waitForUiSettled(page);
      const dropdown = page.locator(".ant-select-dropdown:visible").last();
      const exact = dropdown
        .locator(".ant-select-item-option:not(.ant-select-item-option-disabled)")
        .filter({ hasText: /^全部$/ })
        .first();
      if (await exact.isVisible({ timeout: 3000 }).catch(() => false)) {
        await exact.click();
      } else {
        await page.keyboard.press("ArrowDown").catch(() => {});
        await page.keyboard.press("Enter").catch(() => {});
      }
      await waitForUiSettled(page);
      const text = ((await combobox.innerText({ timeout: 3000 }).catch(() => "")) ?? "").replace(/\s+/g, "");
      return text.includes("全部");
    };
    const fillTableFilter = async (): Promise<void> => {
      const row = modal.locator(".ant-table-row").first();
      const filterCell = row.locator("td").nth(2);
      const filterSelector = filterCell.locator(".ant-select-selector, [role='combobox']").first();
      if (!(await filterSelector.isVisible({ timeout: 5000 }).catch(() => false))) {
        throw new Error(
          `Failed to select metadata table ${tableName} and table filter input is unavailable: ${await readSyncErrorText()}`,
        );
      }
      await filterSelector.click({ timeout: 30_000 });
      await page.keyboard.type(tableName ?? "");
      await waitForUiSettled(page);
      const dropdownOption = page
        .locator(".ant-select-dropdown:visible .ant-select-item-option:not(.ant-select-item-option-disabled)")
        .filter({ hasText: new RegExp(escapeRegExp(tableName ?? ""), "i") })
        .first();
      if (await dropdownOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await dropdownOption.click();
      } else {
        await page.keyboard.press("Enter").catch(() => {});
      }
      await waitForUiSettled(page);
    };
    const trySelectTableWithRetry = async (combobox: ReturnType<typeof modal.locator>, option: string): Promise<boolean> => {
      const timeoutMs = Number(process.env.METADATA_TABLE_SEARCH_TIMEOUT_MS ?? 180_000);
      const deadline = Date.now() + timeoutMs;
      let attempts = 0;
      while (Date.now() < deadline) {
        attempts += 1;
        if (await trySelectComboboxValue(combobox, option, "table")) return true;
        await waitForUiSettled(page);
      }
      if (attempts === 0) return trySelectComboboxValue(combobox, option, "table");
      return false;
    };
    if (tableName) {
      const selectedExactTable = requireExactTable && !allowFilterFallbackForExactTable
        ? await trySelectTableWithRetry(tableCombobox, tableName)
        : await trySelectComboboxValue(tableCombobox, tableName, "table");
      if (selectedExactTable) {
        selectedSyncTableName = tableName;
      } else {
        if (requireExactTable && !allowFilterFallbackForExactTable) {
          throw new Error(
            `Metadata realtime table list did not contain exact table ${tableName} for ${datasourceName}/${database}: ${await readSyncErrorText()}`,
          );
        }
        const selectedAll = await selectAllTablesOption(tableCombobox);
        if (!selectedAll) {
          throw new Error(`Failed to select metadata table 全部 for ${datasourceName}/${database}: ${await readSyncErrorText()}`);
        }
        await fillTableFilter();
      }
    } else {
      await tableCombobox.locator(".ant-select-selector").click();
      await waitForUiSettled(page);
      const tableOptions = page.locator(".ant-select-dropdown:visible .ant-select-item-option");
      // 选第一个可用数据表
      const firstTbl = tableOptions.first();
      if (!(await firstTbl.isVisible({ timeout: 5000 }).catch(() => false))) {
        throw new Error(`No metadata table options are available: ${await readSyncErrorText()}`);
      }
      await firstTbl.click();
    }
    await waitForUiSettled(page);
  }

  const waitForModalClosed = async (timeout = 8000): Promise<boolean> => {
    await waitForUiSettled(page);
    return modal.waitFor({ state: "hidden", timeout }).then(() => true).catch(() => false);
  };
  const clickModalButton = async (name: RegExp, pick: "first" | "last" = "first"): Promise<boolean> => {
    const buttons = modal.locator("button:visible").filter({ hasText: name });
    const count = await buttons.count().catch(() => 0);
    const indexes = Array.from({ length: count }, (_, index) => (pick === "last" ? count - 1 - index : index));
    for (const index of indexes) {
      const button = buttons.nth(index);
      if (!(await button.isVisible({ timeout: 1000 }).catch(() => false))) continue;
      if (!(await button.isEnabled({ timeout: 1000 }).catch(() => false))) continue;
      await button.scrollIntoViewIfNeeded().catch(() => {});
      await button.click({ timeout: 30_000 });
      await waitForUiSettled(page);
      return true;
    }
    return false;
  };

  // 点击"临时同步"按钮；偶发情况下第一次点击后弹窗不关闭，需要再次点击可见按钮确认。
  if (await clickModalButton(/临时同步/)) {
    if (!(await waitForModalClosed())) {
      await clickModalButton(/临时同步/, "last");
      await waitForModalClosed();
    }
  }

  if (await modal.isVisible().catch(() => false)) {
    if (await clickModalButton(/下\s*一\s*步/, "last")) {
      await waitForUiSettled(page);
      if (await clickModalButton(/临时同步|新\s*增|保\s*存|确\s*定/, "last")) {
        await waitForModalClosed();
      }
    }
  }

  if (await modal.isVisible().catch(() => false)) {
    if (await clickModalButton(/临时同步|确\s*定/, "last")) {
      await waitForModalClosed();
    }
  }

  if (await modal.isVisible().catch(() => false)) {
    throw new Error(`Metadata sync dialog did not submit: ${await readSyncErrorText()}`);
  }

  // 等待同步完成
  await waitForUiSettled(page);
  if (datasourceName && database) {
    await waitForSyncListCompletion(page, datasourceName, database, selectedSyncTableName);
  } else {
    await waitForUiSettled(page);
  }
  await waitForUiSettled(page);
}

async function waitForSyncListCompletion(
  page: Page,
  datasourceName: string,
  database: string,
  tableName?: string,
): Promise<void> {
  const deadline = Date.now() + Number(process.env.METADATA_SYNC_TIMEOUT_MS ?? 600_000);
  let lastRowText = "";
  let lastTargetRow: Locator | undefined;
  while (Date.now() < deadline) {
    await waitForUiSettled(page);
    let rows = page
      .locator(".ant-table-tbody tr")
      .filter({ hasText: datasourceName })
      .filter({ hasText: database });
    if (tableName) rows = rows.filter({ hasText: tableName });
    if (await rows.first().isVisible({ timeout: 10_000 }).catch(() => false)) {
      lastTargetRow = rows.first();
      lastRowText = ((await rows.first().innerText({ timeout: 5_000 }).catch(() => "")) ?? "").replace(/\s+/g, " ");
      if (/同步完成/.test(lastRowText)) return;
      if (!/同步中|运行中|进行中|等待|初始化/.test(lastRowText) && /同步/.test(lastRowText)) return;
    }
    const refresh = page
      .getByRole("button", { name: /刷\s*新|查\s*询|search/i })
      .or(page.locator(".anticon-reload, .anticon-search").first())
      .first();
    if (await refresh.isVisible({ timeout: 1000 }).catch(() => false)) {
      await refresh.click({ timeout: 10_000 }).catch(() => {});
    } else {
      await page.reload({ waitUntil: "domcontentloaded", timeout: 30_000 }).catch(() => {});
    }
    await waitForUiSettled(page);
  }
  const instanceText = lastTargetRow ? await readSyncInstanceText(page, lastTargetRow) : "";
  throw new Error(
    `Metadata sync did not complete for ${datasourceName}/${database}${tableName ? `/${tableName}` : ""}; lastRow=${lastRowText}${
      instanceText ? `; instance=${instanceText}` : ""
    }`,
  );
}

async function findExistingSyncRow(
  page: Page,
  datasourceName: string,
  database: string,
  tableName: string,
): Promise<Locator | undefined> {
  const searchInput = page.locator("input[placeholder*='数据源名称'], input[placeholder*='搜索']").first();
  if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await searchInput.fill(datasourceName, { timeout: 10_000 }).catch(() => {});
    await page.keyboard.press("Enter").catch(() => {});
    await waitForUiSettled(page);
    await waitForUiSettled(page);
  }
  const row = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: datasourceName })
    .filter({ hasText: database })
    .filter({ hasText: tableName })
    .first();
  return (await row.isVisible({ timeout: 5000 }).catch(() => false)) ? row : undefined;
}

async function readSyncInstanceText(page: Page, row: Locator): Promise<string> {
  const viewInstance = row
    .getByRole("button", { name: /查看实例/ })
    .or(row.locator("text=查看实例"))
    .first();
  if (!(await viewInstance.isVisible({ timeout: 1000 }).catch(() => false))) return "";
  await viewInstance.click({ timeout: 10_000 }).catch(() => {});
  await waitForUiSettled(page);
  await waitForUiSettled(page);
  const detailRoot = page.locator(".ant-modal:visible, .ant-drawer:visible").last();
  const raw = (await detailRoot.innerText({ timeout: 3000 }).catch(async () => page.locator("body").innerText({ timeout: 3000 }).catch(() => ""))) ?? "";
  const text = raw.replace(/\s+/g, " ").trim();
  await page.keyboard.press("Escape").catch(() => {});
  return text.slice(0, 2000);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
