import { expect, type Page } from "@playwright/test";

import {
  createClient,
  setupPreconditions,
  type PrecondTable,
} from "../../../../../../_shared/automation/preconditions/setup-preconditions";
import {
  clickButtonByText,
  expectAnyText,
  metadataScope,
  uniqueMetadataName,
  waitForDassetsResponse,
} from "./metadata-shell-page";
import { openDataMap, searchDataMap } from "./metadata-search-page";

export type DeletableAssetKind = "table" | "view" | "materialized_view";

export async function createDeletableAsset(
  page: Page,
  kind: DeletableAssetKind,
  sourceRef: string,
): Promise<string> {
  const name = uniqueMetadataName(kind);
  const table = buildPreconditionTable(name, kind);
  const scope = metadataScope();
  const result = await setupPreconditions({
    client: await createClient(page),
    project: scope.offlineProjectName,
    projectId: scope.offlineProjectId,
    datasource: scope.datasourceProfile.preconditionType,
    datasourceProfile: scope.datasourceProfile,
    database: scope.database,
    tables: [table],
    syncTimeoutMs: 180000,
    autoCreate: false,
  });
  expect(result.tablesCreated, `${sourceRef}: 应创建专属测试对象 ${name}`).toContain(name);
  expect(result.syncComplete, `${sourceRef}: 专属测试对象应同步到数据地图`).toBe(true);
  return name;
}

export async function openFirstTableDetail(
  page: Page,
  keyword: string,
  sourceRef: string,
): Promise<void> {
  await openDataMap(page, sourceRef);
  await searchDataMap(page, keyword, sourceRef);
  const firstRow = page.locator(".ant-table-row").first();
  await expect(firstRow, `${sourceRef}: 搜索结果应至少有一行`).toBeVisible({ timeout: 30000 });
  await waitForDassetsResponse(
    page,
    async () => {
      await firstRow.click();
    },
    sourceRef,
    (url) => /detail|metadata|table|asset/i.test(url),
  );
  await expectAnyText(page, ["基本信息", "数据预览", "血缘关系"], sourceRef);
}

export async function expectTableTagFlow(page: Page, sourceRef: string): Promise<void> {
  await openFirstTableDetail(page, "test_table", sourceRef);
  let tagSaved = false;
  try {
    await clickButtonByText(page, "编辑", sourceRef);
    const tagInput = page
      .locator("input[placeholder*='标签'], .ant-select-selection-search-input")
      .first();
    await expect(tagInput, `${sourceRef}: 标签输入框应可见`).toBeVisible({ timeout: 15000 });
    await tagInput.fill("table1_tag");
    await clickButtonByText(page, "保存", sourceRef);
    tagSaved = true;
    await expectAnyText(page, ["table1_tag"], sourceRef);
  } finally {
    // 还原状态：已保存的标签要清掉，未保存成功的弹窗要关闭，避免污染后续用例
    if (tagSaved) {
      await clickButtonByText(page, "编辑", sourceRef).catch(() => {});
      const tagInput = page
        .locator("input[placeholder*='标签'], .ant-select-selection-search-input")
        .first();
      if (await tagInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await tagInput.fill("");
        await clickButtonByText(page, "保存", sourceRef).catch(() => {});
      }
    } else {
      const cancelButton = page.getByRole("button", { name: /取消/ }).last();
      if (await cancelButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await cancelButton.click().catch(() => {});
      }
    }
  }
}

export async function expectDataPreview(page: Page, sourceRef: string): Promise<void> {
  await openFirstTableDetail(page, "test_table", sourceRef);
  await clickButtonByText(page, "数据预览", sourceRef);
  await expectAnyText(page, ["字段", "id", "name", "暂无数据"], sourceRef);
}

export async function expectDataTableList(page: Page, sourceRef: string): Promise<void> {
  await openDataMap(page, sourceRef);
  await searchDataMap(page, "test", sourceRef);
  await expectAnyText(page, ["表名", "表中文名", "创建时间", "存储大小", "更新时间"], sourceRef);
}

export async function deleteDeletableAsset(
  page: Page,
  kind: DeletableAssetKind,
  sourceRef: string,
): Promise<void> {
  const name = await createDeletableAsset(page, kind, sourceRef);
  await openFirstTableDetail(page, name, sourceRef);
  await clickButtonByText(page, "删除", sourceRef);
  await expectAnyText(page, ["删除", "删除元数据", "删除源"], sourceRef);
  const input = page.locator(".ant-modal:visible input").first();
  await expect(input, `${sourceRef}: 删除确认表名输入框应可见`).toBeVisible({ timeout: 15000 });
  await input.fill(name);
  await waitForDassetsResponse(
    page,
    async () => {
      await clickButtonByText(page, "删除", sourceRef);
    },
    sourceRef,
    (url) => /delete|remove|metadata|table/i.test(url),
  );
  await openDataMap(page, sourceRef);
  await searchDataMap(page, name, sourceRef);
  await expect(page.locator("body"), `${sourceRef}: 删除后数据地图不应展示 ${name}`).toContainText(
    "暂无数据",
    {
      timeout: 30000,
    },
  );
}

function buildPreconditionTable(name: string, kind: DeletableAssetKind): PrecondTable {
  const ddl = {
    table: `CREATE TABLE IF NOT EXISTS ${name} (id INT, name STRING, info STRING)`,
    view: `CREATE VIEW ${name} AS SELECT 1 AS id, 'view' AS name`,
    materialized_view: `CREATE MATERIALIZED VIEW ${name} AS SELECT 1 AS id, 'mv' AS name`,
  } as const;
  return { name, sql: ddl[kind] };
}
