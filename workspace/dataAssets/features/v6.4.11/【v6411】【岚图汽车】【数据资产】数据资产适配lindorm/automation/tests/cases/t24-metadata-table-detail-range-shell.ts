// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L1034,#L1137,#L1155,#L1174,#L1203,#L1217,#L1234,#L1250
// intent: SR-INTENT-2099-01-MD-024
// probe: results/20260523-2015-mf-metadata-detail-range-01/playwright/ui-probe/probe.json
// page: inline shell assertions; metadata shell project bootstrap
// generated_at: 2026-05-23T20:15:00+08:00
// META: {"id":"MD-024","priority":"P1/P2/P3","title":"元数据表详情 L1034-L1250 只读 Shell 合约可核验"}
// SourceRefs: SR-2099-01-MD-024, SR-2099-01-MD-DETAIL-QUALITY-SCORE-L1137, SR-2099-01-MD-DETAIL-DATA-PREVIEW-L1155, SR-2099-01-MD-DETAIL-LINEAGE-L1174, SR-2099-01-MD-DETAIL-TASK-DEPENDENCY-L1203, SR-2099-01-MD-DETAIL-FILE-GOVERNANCE-L1217, SR-2099-01-MD-DETAIL-VERSION-CHANGE-L1234, SR-2099-01-MD-DETAIL-OPERATION-RECORD-L1250, SR-UI-PROBE-20260523-MF-METADATA-DETAIL-RANGE-001, SR-SELF-RUN-20260523-MF-METADATA-DETAIL-RANGE-001
import { expect, type Page, type Response } from "@playwright/test";

import { test } from "../../../../../../_shared/fixtures/step-screenshot";
import { gotoMetadataPage } from "../../../../../../_shared/pages/2099-01-lt-dq-main-flow/metadata-shell-page";

test.setTimeout(180000);

test("【P1/P2/P3】元数据表详情 L1034-L1250 只读 Shell 合约可核验", async ({
  page,
  step,
}) => {
  await step("步骤1: 搜索稳定数据表并进入表详情 → 详情页主标签和右侧信息可见", async () => {
    await openMetadataTableDetail(page, "test_table", "SR-2099-01-MD-024");
    await expectDetailShell(page, "SR-2099-01-MD-024");
  });

  await step("步骤2: 查看表结构字段 → 字段列、分页、只读操作入口可见", async () => {
    await clickTab(page, "表结构", "SR-2099-01-MD-024");
    await clickTab(page, "字段", "SR-2099-01-MD-024");
    await expectFieldStructureContract(page, "SR-2099-01-MD-024");
  });

  await step("步骤3: 查看建表语句与质量评分条件 → 建表页签可见且无质量评分 fixture", async () => {
    await clickTab(page, "建表语句", "SR-2099-01-MD-024");
    await expectCreateTableSqlShell(page, "SR-2099-01-MD-024");
    await expect(page.locator("body"), "SR-2099-01-MD-DETAIL-QUALITY-SCORE-L1137: 当前 fixture 未展示数据质量评分").not.toContainText(
      "数据质量评分",
    );
  });

  await step("步骤4: 查看数据预览 → 当前 fixture 空状态可见", async () => {
    await clickTopLevelTabAndWait(page, "数据预览", /dataSource\/judgeOpenDataPreviewByParam/, "SR-2099-01-MD-DETAIL-DATA-PREVIEW-L1155");
    await expectDataPreviewShell(page, "SR-2099-01-MD-DETAIL-DATA-PREVIEW-L1155");
  });

  await step("步骤5: 查看血缘关系 → 表级/字段级血缘工具 Shell 可见", async () => {
    await clickTopLevelTabAndWait(page, "血缘关系", /lineage\/tableLineage/, "SR-2099-01-MD-DETAIL-LINEAGE-L1174");
    await expectLineageShell(page, "SR-2099-01-MD-DETAIL-LINEAGE-L1174");
  });

  await step("步骤6: 查看任务依赖 → 离线/实时任务列表 Shell 可见", async () => {
    await clickTopLevelTabAndWait(page, "任务依赖", /dataMap\/tableRely\/page/, "SR-2099-01-MD-DETAIL-TASK-DEPENDENCY-L1203");
    await expectTaskDependencyShell(page, "SR-2099-01-MD-DETAIL-TASK-DEPENDENCY-L1203");
  });

  await step("步骤7: 查看文件治理 → 治理记录表头和分页 Shell 可见", async () => {
    await clickTab(page, "文件治理", "SR-2099-01-MD-DETAIL-FILE-GOVERNANCE-L1217");
    await expectFileGovernanceShell(page, "SR-2099-01-MD-DETAIL-FILE-GOVERNANCE-L1217");
  });

  await step("步骤8: 查看版本变更 → 版本表头、空状态和对比入口可见", async () => {
    await clickTab(page, "版本变更", "SR-2099-01-MD-DETAIL-VERSION-CHANGE-L1234");
    await expectVersionChangeShell(page, "SR-2099-01-MD-DETAIL-VERSION-CHANGE-L1234");
  });

  await step("步骤9: 查看操作记录 → 查询条件、表头和空状态可见", async () => {
    await clickTab(page, "操作记录", "SR-2099-01-MD-DETAIL-OPERATION-RECORD-L1250");
    await expectOperationRecordShell(page, "SR-2099-01-MD-DETAIL-OPERATION-RECORD-L1250");
  });
});

async function openMetadataTableDetail(page: Page, keyword: string, sourceRef: string): Promise<void> {
  await gotoMetadataPage(page, "/metaDataSearch");

  const searchInput = page.getByPlaceholder("请输入表名、表中文名、库名、数据源名").first();
  await expect(searchInput, `${sourceRef}: 数据地图搜索框应可见`).toBeVisible({ timeout: 30000 });

  const queryResponsePromise = waitForDassetsResponse(page, /datamap\/queryDetail/);
  await searchInput.fill(keyword);
  await searchInput.press("Enter");
  const queryResponse = await queryResponsePromise;
  expect(queryResponse.status(), `${sourceRef}: 数据地图查询接口应返回 200`).toBe(200);
  const queryBody = (await queryResponse.json()) as DataMapQueryResponse;
  const rows = readQueryRows(queryBody);
  expect(rows.length, `${sourceRef}: 查询 ${keyword} 应返回稳定数据表记录`).toBeGreaterThan(0);
  const targetTableName = readFirstTableName(rows, keyword);
  expect(targetTableName, `${sourceRef}: 查询结果应包含 ${keyword} 相关表名`).not.toBe("");

  const targetTable = page.locator(`:text-is("${keyword}")`).first();
  await expect(targetTable, `${sourceRef}: 搜索结果中表关键词 ${keyword} 应可见`).toBeVisible({
    timeout: 30000,
  });
  const detailResponsePromise = waitForDassetsResponse(page, /detail|metadata|table|asset|column/i);
  await targetTable.click();
  const detailResponse = await detailResponsePromise;
  expect(detailResponse.status(), `${sourceRef}: 打开表详情应返回 200`).toBe(200);
  await expect(page.locator("body"), `${sourceRef}: 应进入表详情页`).toContainText("表详情", {
    timeout: 30000,
  });
}

async function expectDetailShell(page: Page, sourceRef: string): Promise<void> {
  const body = page.locator("body");
  for (const label of [
    "表结构",
    "数据预览",
    "血缘关系",
    "任务依赖",
    "文件治理",
    "版本变更",
    "操作记录",
    "基本信息",
    "热度统计",
  ]) {
    await expect(body, `${sourceRef}: 表详情应展示「${label}」`).toContainText(label, { timeout: 30000 });
  }
  for (const label of ["资产类型", "表来源", "描述信息", "标签", "我的权限", "数据目录"]) {
    await expect(body, `${sourceRef}: 右侧基本信息应展示「${label}」`).toContainText(label, { timeout: 30000 });
  }
  await expect(
    page.getByRole("button", { name: /导\s*出/ }).first(),
    `${sourceRef}: 导出入口应可见但本用例不点击`,
  ).toBeVisible({ timeout: 15000 });
  await expect(
    page.getByRole("button", { name: /订\s*阅/ }).first(),
    `${sourceRef}: 订阅入口应可见但本用例不点击`,
  ).toBeVisible({ timeout: 15000 });
}

async function expectFieldStructureContract(page: Page, sourceRef: string): Promise<void> {
  const body = page.locator("body");
  for (const label of ["字段名", "字段描述", "字段标签", "字段中文名", "数据类型"]) {
    await expect(body, `${sourceRef}: 表结构字段列表应展示列「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
  await expect(body, `${sourceRef}: 字段列表应展示稳定字段 id`).toContainText("id", { timeout: 30000 });
  await expect(body, `${sourceRef}: 字段列表应展示分页总数`).toContainText(/共\s*\d+\s*条数据/);
  await expect(body, `${sourceRef}: 字段列表应展示 PageSize`).toContainText(/10\s*条\/页/);
  await expect(
    page.getByRole("button", { name: /批量编辑/ }).first(),
    `${sourceRef}: 批量编辑入口应可见但本用例不进入编辑态`,
  ).toBeVisible({ timeout: 15000 });
  await expect(
    page.getByRole("button", { name: /添加标签/ }).first(),
    `${sourceRef}: 添加标签入口应可见但本用例不编辑标签`,
  ).toBeVisible({ timeout: 15000 });
}

async function expectCreateTableSqlShell(page: Page, sourceRef: string): Promise<void> {
  const body = page.locator("body");
  await expect(body, `${sourceRef}: 建表语句页签应保持可见`).toContainText("建表语句", { timeout: 30000 });
  await expect(body, `${sourceRef}: 当前 fixture 的建表语句区域应展示空状态或表属性`).toContainText(
    /暂无数据|表名：/,
    { timeout: 30000 },
  );
}

async function expectDataPreviewShell(page: Page, sourceRef: string): Promise<void> {
  const body = page.locator("body");
  await expect(body, `${sourceRef}: 数据预览页签应保持可见`).toContainText("数据预览", { timeout: 30000 });
  await expect(body, `${sourceRef}: 当前 fixture 数据预览应展示空状态`).toContainText("暂无数据", {
    timeout: 30000,
  });
}

async function expectLineageShell(page: Page, sourceRef: string): Promise<void> {
  const body = page.locator("body");
  for (const label of ["表级血缘", "字段级血缘", "展示文字信息", "资产类型", "导航器"]) {
    await expect(body, `${sourceRef}: 血缘关系应展示「${label}」`).toContainText(label, { timeout: 30000 });
  }
  await expect(body, `${sourceRef}: 血缘关系应展示右键全链路提示文案`).toContainText(/每个节点都可右键查看/, {
    timeout: 30000,
  });
}

async function expectTaskDependencyShell(page: Page, sourceRef: string): Promise<void> {
  const body = page.locator("body");
  for (const label of ["离线任务", "实时任务", "任务名称", "任务类型", "和该表的关系", "负责人"]) {
    await expect(body, `${sourceRef}: 任务依赖应展示「${label}」`).toContainText(label, { timeout: 30000 });
  }
}

async function expectFileGovernanceShell(page: Page, sourceRef: string): Promise<void> {
  const body = page.locator("body");
  for (const label of ["开始时间", "结束时间", "操作人", "状态", "治理前文件数", "治理后文件数", "操作"]) {
    await expect(body, `${sourceRef}: 文件治理应展示列「${label}」`).toContainText(label, { timeout: 30000 });
  }
  await expect(body, `${sourceRef}: 文件治理应展示分页总数`).toContainText(/共\s*\d+\s*条数据/, {
    timeout: 30000,
  });
}

async function expectVersionChangeShell(page: Page, sourceRef: string): Promise<void> {
  const body = page.locator("body");
  for (const label of ["版本号", "操作人", "操作时间"]) {
    await expect(body, `${sourceRef}: 版本变更应展示列「${label}」`).toContainText(label, { timeout: 30000 });
  }
  await expect(body, `${sourceRef}: 版本变更应展示空状态`).toContainText("暂无数据", { timeout: 30000 });
  await expect(
    page.getByRole("button", { name: /版本对比/ }).first(),
    `${sourceRef}: 版本对比入口应可见但本用例不选择版本`,
  ).toBeVisible({ timeout: 15000 });
}

async function expectOperationRecordShell(page: Page, sourceRef: string): Promise<void> {
  const body = page.locator("body");
  for (const label of ["变更时间", "操作人", "请选择操作人", "变更语句", "语句类型", "操作语句"]) {
    await expect(body, `${sourceRef}: 操作记录应展示「${label}」`).toContainText(label, { timeout: 30000 });
  }
  await expect(body, `${sourceRef}: 当前 fixture 操作记录应展示空状态`).toContainText("暂无数据", {
    timeout: 30000,
  });
}

async function clickTopLevelTabAndWait(
  page: Page,
  label: string,
  responsePattern: RegExp,
  sourceRef: string,
): Promise<void> {
  const responsePromise = waitForDassetsResponse(page, responsePattern);
  await clickTab(page, label, sourceRef);
  const response = await responsePromise;
  expect(response.status(), `${sourceRef}: 切换到「${label}」应触发 ${responsePattern} 接口 200`).toBe(200);
}

async function clickTab(page: Page, label: string, sourceRef: string): Promise<void> {
  const tab = page.getByRole("tab", { name: new RegExp(escapeRegExp(label)) }).first();
  if (await tab.isVisible({ timeout: 5000 })) {
    await tab.click();
    return;
  }
  const textTab = page.locator(".ant-tabs-tab, .ant-segmented-item, button").filter({ hasText: label }).first();
  if (await textTab.isVisible({ timeout: 5000 })) {
    await textTab.click();
    return;
  }
  const exactText = page.getByText(label, { exact: true }).first();
  await expect(exactText, `${sourceRef}: 应可切换到「${label}」`).toBeVisible({ timeout: 15000 });
  await exactText.click();
}

function waitForDassetsResponse(page: Page, pattern: RegExp): Promise<Response> {
  return page.waitForResponse(
    (response) =>
      response.url().includes("/dassets/") &&
      pattern.test(response.url()) &&
      response.request().method() === "POST",
    { timeout: 45000 },
  );
}

function readQueryRows(response: DataMapQueryResponse): unknown[] {
  const data = response.data;
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  for (const key of ["contentList", "list", "rows", "records", "content"]) {
    const value = data[key];
    if (Array.isArray(value)) return value;
  }
  const nestedData = data.data;
  if (Array.isArray(nestedData)) return nestedData;
  if (nestedData && typeof nestedData === "object") {
    const nestedRecord = nestedData as Record<string, unknown>;
    for (const key of ["contentList", "list", "rows", "records", "content"]) {
      const value = nestedRecord[key];
      if (Array.isArray(value)) return value;
    }
  }
  return [];
}

function readFirstTableName(rows: unknown[], keyword: string): string {
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const tableName = (row as Record<string, unknown>).tableName;
    if (typeof tableName === "string" && tableName.includes(keyword)) {
      return tableName;
    }
  }
  return "";
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

interface DataMapQueryResponse {
  readonly data?: unknown[] | Record<string, unknown>;
}
