// spec: features/v7.0.0/2026-06-dq-json-export-checkbox/cases/archive.md#case=勾选导出
// intent: SR-INTENT-V700-16019-JSON-EXPORT
// probe: SR-UI-PROBE-20260706-V700-16019-LTQC-SY
// page: _shared/pages/2099-01-lt-dq-main-flow/data-quality-page.ts
// generated_at: 2026-07-06T04:10:21Z
import fs from "node:fs";
import path from "node:path";

import ExcelJS from "exceljs";
import type { Locator, Page } from "@playwright/test";

import { expect, test } from "../../../../../../_shared/fixtures/step-screenshot";
import { gotoDataQualityPage } from "../../../../../../_shared/pages/2099-01-lt-dq-main-flow/data-quality-page";

type ExportRows = {
  headers: string[];
  rows: string[][];
  rowByKey: Map<string, string[]>;
  downloadPath: string;
  suggestedFilename: string;
};

type ExportEvidence = {
  caseId: string;
  route: string;
  selectedKeys: string[];
  exportedKeys: string[];
  downloadPath: string;
  suggestedFilename: string;
};

const OUT_DIR = path.resolve(defaultRunSubdir("json-export"));
const EVIDENCE_JSONL = path.join(OUT_DIR, "json-export-evidence.jsonl");

const EXPECTED_HEADERS = [
  "key",
  "中文名称",
  "value格式",
  "数据源类型",
  "创建人",
  "创建时间",
  "更新人",
  "更新时间",
  "层级关系",
  "父Key",
];

test.describe("v700 16019 json格式校验勾选导出 @serial", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(() => {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(EVIDENCE_JSONL, "");
  });

  test("【P0】验证勾选多条记录后点击导出，导出文件仅含勾选行", async ({ page, step }) => {
    await step("步骤1: 进入 json格式校验管理并搜索 export → exportA/exportB/exportC 可见", async () => {
      await gotoJsonValidationPage(page);
      await searchKey(page, "export");
      for (const key of ["exportA", "exportB", "exportC"]) {
        await expect(rowByKey(page, key), `列表应展示 ${key}`).toBeVisible({ timeout: 30000 });
      }
    });

    await step("步骤2: 勾选 exportA、exportB → 当前选中为 2，exportC 未选中", async () => {
      await selectRowCheckbox(page, "exportA");
      await selectRowCheckbox(page, "exportB");
      await expectSelectedCount(page, 2);
      await expectRowChecked(page, "exportA", true);
      await expectRowChecked(page, "exportB", true);
      await expectRowChecked(page, "exportC", false);
    });

    const exported = await stepWithExport(page, step, "步骤3-4: 点击导出并核对文件 → 仅包含 exportA/exportB", "p0-multi");
    expectExportedKeysExactly(exported, ["exportA", "exportB"]);
    expect(exported.rowByKey.has("exportC"), "导出文件不应包含 exportC").toBe(false);
    expectHeaderOrder(exported.headers);
    await recordEvidence(page, "P0-multi-selected", ["exportA", "exportB"], exported);
  });

  test("【P0】验证未勾选任何记录时点击导出，沿用导出全量旧行为", async ({ page, step }) => {
    let visibleKeys: string[] = [];
    await step("步骤1: 进入 json格式校验管理并收集当前列表数据 → 无行被勾选", async () => {
      await gotoJsonValidationPage(page);
      visibleKeys = await collectVisibleKeysAcrossPages(page, 5);
      expect(visibleKeys.length, "当前列表应至少有一条记录").toBeGreaterThan(0);
      await expectVisibleCheckedCount(page, 0);
    });

    const exported = await stepWithExport(page, step, "步骤2-3: 零勾选导出并核对文件 → 文件包含当前列表记录", "p0-zero-selected");
    expectHeaderOrder(exported.headers);
    expectFileContainsKeys(exported, visibleKeys.slice(0, 20));
    expect(exported.rows.length, "零勾选导出不应为空").toBeGreaterThanOrEqual(visibleKeys.length);
    await recordEvidence(page, "P0-zero-selected", [], exported);
  });

  test("【P0】验证仅勾选单条一层级记录导出，文件仅含该条记录", async ({ page, step }) => {
    await step("步骤1-2: 搜索并仅勾选 singleExport → 当前选中为 1", async () => {
      await gotoJsonValidationPage(page);
      await searchKey(page, "singleExport");
      await selectRowCheckbox(page, "singleExport");
      await expectSelectedCount(page, 1);
    });

    const exported = await stepWithExport(page, step, "步骤3-4: 导出并核对单条记录字段 → 仅包含 singleExport", "p0-single");
    expectExportedKeysExactly(exported, ["singleExport"]);
    expectCell(exported, "singleExport", "中文名称", "单行导出");
    expectCell(exported, "singleExport", "value格式", "^\\d+$");
    expectCell(exported, "singleExport", "数据源类型", "SparkThrift2.x");
    expectCell(exported, "singleExport", "层级关系", "一层");
    expectCell(exported, "singleExport", "父Key", "");
    await recordEvidence(page, "P0-single-selected", ["singleExport"], exported);
  });

  test("【P1】验证表头全选后点击导出，文件含当前列表全量数据", async ({ page, step }) => {
    let pageKeys: string[] = [];
    await step("步骤1-2: 搜索 Page 并点击表头全选 → 当前页行全部选中", async () => {
      await gotoJsonValidationPage(page);
      await searchKey(page, "Page");
      pageKeys = await readVisibleRowKeys(page);
      expect(pageKeys.length, "Page 前置数据应存在").toBeGreaterThanOrEqual(2);
      await selectHeaderCheckbox(page);
      await expectSelectedCount(page, pageKeys.length);
    });

    const exported = await stepWithExport(page, step, "步骤3-4: 导出并核对全选数据 → 文件记录数与当前可见行一致", "p1-select-all");
    expectExportedKeysExactly(exported, pageKeys);
    await recordEvidence(page, "P1-select-all", pageKeys, exported);
  });

  test("【P1】验证勾选父节点时子节点被自动级联进导出文件", async ({ page, step }) => {
    await step("步骤1-2: 搜索 parentOnly 并勾选父节点 → 当前选中为 2", async () => {
      await gotoJsonValidationPage(page);
      await searchKey(page, "parentOnly");
      await expect(rowByKey(page, "parentOnly"), "父节点 parentOnly 应可见").toBeVisible({
        timeout: 30000,
      });
      await selectRowCheckbox(page, "parentOnly");
      await expectSelectedCount(page, 2);
    });

    const exported = await stepWithExport(page, step, "步骤3-4: 导出并核对级联结果 → 文件包含父子两条记录", "p1-parent-cascade");
    expectExportedKeysExactly(exported, ["parentOnly", "childNotExport"]);
    await recordEvidence(page, "P1-parent-cascade", ["parentOnly"], exported);
  });

  test("【P1】验证勾选导出文件列结构完整且顺序正确", async ({ page, step }) => {
    await step("步骤1-2: 搜索并勾选 keySpark → 下载前置记录选中", async () => {
      await gotoJsonValidationPage(page);
      await searchKey(page, "keySpark");
      await selectRowCheckbox(page, "keySpark");
      await expectSelectedCount(page, 1);
    });

    const exported = await stepWithExport(page, step, "步骤3: 导出并核对表头 → 10 列完整且顺序正确", "p1-header-order");
    expectHeaderOrder(exported.headers);
    await recordEvidence(page, "P1-header-order", ["keySpark"], exported);
  });

  test("【P1】验证多层级 key 的「层级关系」与「父 Key」取值正确", async ({ page, step }) => {
    await step("步骤1-2: 展开并勾选 lvl1 至 lvl5 → 当前选中为 5", async () => {
      await gotoJsonValidationPage(page);
      await searchKey(page, "lvl1");
      for (const key of ["lvl1", "lvl2", "lvl3", "lvl4", "lvl5"]) {
        await expect(rowByKey(page, key), `${key} 应可见`).toBeVisible({ timeout: 30000 });
        await selectRowCheckbox(page, key);
        if (key !== "lvl5") await expandRowIfCollapsed(page, key);
      }
      await expectSelectedCount(page, 5);
    });

    const exported = await stepWithExport(page, step, "步骤3: 导出并核对层级关系/父 Key → 五层级取值正确", "p1-levels");
    expectExportedKeysExactly(exported, ["lvl1", "lvl2", "lvl3", "lvl4", "lvl5"]);
    expectCell(exported, "lvl1", "层级关系", "一层");
    expectCell(exported, "lvl1", "父Key", "");
    expectCell(exported, "lvl2", "层级关系", "二层");
    expectCell(exported, "lvl2", "父Key", "lvl1");
    expectCell(exported, "lvl3", "层级关系", "三层");
    expectCell(exported, "lvl3", "父Key", "lvl2");
    expectCell(exported, "lvl4", "层级关系", "四层");
    expectCell(exported, "lvl4", "父Key", "lvl3");
    expectCell(exported, "lvl5", "层级关系", "五层");
    expectCell(exported, "lvl5", "父Key", "lvl4");
    await recordEvidence(page, "P1-levels", ["lvl1", "lvl2", "lvl3", "lvl4", "lvl5"], exported);
  });

  test("【P1】验证导出文件「数据源类型」列对 SparkThrift2.x、Hive2.x、Doris3.x 取值正确", async ({ page, step }) => {
    await step("步骤1-2: 搜索 key 并勾选三类数据源记录 → 当前选中为 3", async () => {
      await gotoJsonValidationPage(page);
      await searchKey(page, "key");
      for (const key of ["keySpark", "keyHive", "keyDoris"]) {
        await expect(rowByKey(page, key), `${key} 应可见`).toBeVisible({ timeout: 30000 });
        await selectRowCheckbox(page, key);
      }
      await expectSelectedCount(page, 3);
    });

    const exported = await stepWithExport(page, step, "步骤3: 导出并核对数据源类型 → 三类取值正确", "p1-datasource-types");
    expectExportedKeysExactly(exported, ["keySpark", "keyHive", "keyDoris"]);
    expectCell(exported, "keySpark", "数据源类型", "SparkThrift2.x");
    expectCell(exported, "keyHive", "数据源类型", "Hive2.x");
    expectCell(exported, "keyDoris", "数据源类型", "Doris3.x");
    await recordEvidence(page, "P1-datasource-types", ["keySpark", "keyHive", "keyDoris"], exported);
  });

  test("【P2】验证先搜索筛选再勾选导出，文件仅含搜索结果中勾选的行", async ({ page, step }) => {
    let visibleVehicleKeys: string[] = [];
    await step("步骤1-3: 搜索 vehicle 并勾选一行 → 当前选中为 1", async () => {
      await gotoJsonValidationPage(page);
      await searchKey(page, "vehicle");
      visibleVehicleKeys = await readVisibleRowKeys(page);
      expect(visibleVehicleKeys.length, "vehicle 搜索结果应存在").toBeGreaterThan(0);
      await selectRowCheckbox(page, "vehicle");
      await expectSelectedCount(page, 1);
    });

    const exported = await stepWithExport(page, step, "步骤4: 导出并核对搜索后勾选结果 → 仅包含 vehicle", "p2-search-selected");
    expectExportedKeysExactly(exported, ["vehicle"]);
    for (const key of visibleVehicleKeys.filter((item) => item !== "vehicle")) {
      expect(exported.rowByKey.has(key), `导出文件不应包含未勾选的搜索结果 ${key}`).toBe(false);
    }
    expect(exported.rowByKey.has("keySpark"), "导出文件不应包含被搜索过滤掉的 keySpark").toBe(false);
    await recordEvidence(page, "P2-search-selected", ["vehicle"], exported);
  });
});

function defaultRunSubdir(subdir: string): string {
  const runPath = process.env.KATA_RUN_PATH;
  if (process.env.KATA_DISCOVERY_ONLY === "1") {
    return path.resolve(process.cwd(), "workspace/dataAssets/runs/discovery/_tmp", subdir);
  }
  if (!runPath) throw new Error("KATA_RUN_PATH is required; run through kata automation or kata runs exec");
  return path.join(path.resolve(runPath), subdir);
}

async function gotoJsonValidationPage(page: Page): Promise<void> {
  await gotoDataQualityPage(page, "/dq/generalConfig/jsonValidationConfig");
  await closeGuideIfPresent(page);
  await expect(page.locator("body"), "json格式校验管理页面应打开").toContainText("json格式校验管理", {
    timeout: 30000,
  });
  await expect(page.locator(".ant-table-thead"), "列表应展示 key 列").toContainText("key", {
    timeout: 30000,
  });
  await waitTableSettled(page);
}

async function closeGuideIfPresent(page: Page): Promise<void> {
  const guideButton = page.getByText("知道了", { exact: true }).last();
  if (await guideButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await guideButton.click({ timeout: 10000 });
    await guideButton.waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
  }
}

async function waitTableSettled(page: Page): Promise<void> {
  await expect(page.locator(".ant-spin-spinning"), "表格加载遮罩应消失").toHaveCount(0, {
    timeout: 30000,
  });
}

async function searchKey(page: Page, keyword: string): Promise<void> {
  const response = page
    .waitForResponse((item) => item.url().includes("/dassets/v1/valid/jsonValidationConfig/getTreeByPage"), {
      timeout: 30000,
    })
    .catch(() => null);
  const input = page.getByPlaceholder("请输入key名称查询");
  await input.fill(keyword, { timeout: 30000 });
  await page.keyboard.press("Enter");
  const res = await response;
  if (res) expect(res.status(), `${keyword}: 搜索接口应返回 200`).toBe(200);
  await waitTableSettled(page);
  await expect(page.locator(".ant-table-tbody"), `${keyword}: 搜索结果应展示目标文本`).toContainText(keyword, {
    timeout: 30000,
  });
}

function rowByKey(page: Page, key: string): Locator {
  return page.locator(".ant-table-tbody tr").filter({ hasText: key }).first();
}

async function selectRowCheckbox(page: Page, key: string): Promise<void> {
  const row = rowByKey(page, key);
  await expect(row, `${key}: 行应可见`).toBeVisible({ timeout: 30000 });
  const label = row.locator("label.ant-checkbox-wrapper").first();
  await expect(label, `${key}: 行复选框应可见`).toBeVisible({ timeout: 30000 });
  const input = label.locator("input[type='checkbox']").first();
  if (!(await input.isChecked().catch(() => false))) {
    await clickCheckboxInput(input);
  }
  await expect(input, `${key}: 复选框应选中`).toBeChecked({ timeout: 30000 });
}

async function selectHeaderCheckbox(page: Page): Promise<void> {
  const label = page.locator(".ant-table-thead label.ant-checkbox-wrapper").first();
  await expect(label, "表头全选复选框应可见").toBeVisible({ timeout: 30000 });
  const input = label.locator("input[type='checkbox']").first();
  if (!(await input.isChecked().catch(() => false))) {
    await clickCheckboxInput(input);
  }
  await expect(input, "表头全选复选框应选中").toBeChecked({ timeout: 30000 });
}

async function clickCheckboxInput(input: Locator): Promise<void> {
  await input.evaluate((node: HTMLInputElement) => node.click());
}

async function expectRowChecked(page: Page, key: string, checked: boolean): Promise<void> {
  const input = rowByKey(page, key).locator("label.ant-checkbox-wrapper input[type='checkbox']").first();
  if (checked) await expect(input, `${key}: 应选中`).toBeChecked({ timeout: 30000 });
  else await expect(input, `${key}: 应未选中`).not.toBeChecked({ timeout: 30000 });
}

async function expectSelectedCount(page: Page, expected: number): Promise<void> {
  await expect
    .poll(
      async () => {
        const body = await page.locator("body").innerText({ timeout: 3000 }).catch(() => "");
        if (new RegExp(`(当前选中|已选择|已选)[:：]?\\s*${expected}`).test(body)) return true;
        const visibleChecked = await page.locator(".ant-table-tbody .ant-checkbox-checked").count();
        return visibleChecked >= expected;
      },
      { timeout: 30000, message: `当前选中数量应为 ${expected}` },
    )
    .toBe(true);
}

async function expectVisibleCheckedCount(page: Page, expected: number): Promise<void> {
  await expect
    .poll(async () => page.locator(".ant-table-tbody .ant-checkbox-checked").count(), {
      timeout: 10000,
      message: `可见选中行数应为 ${expected}`,
    })
    .toBe(expected);
}

async function expandRowIfCollapsed(page: Page, key: string): Promise<void> {
  const row = rowByKey(page, key);
  const collapsed = row.locator(".ant-table-row-expand-icon-collapsed").first();
  if (await collapsed.isVisible({ timeout: 2000 }).catch(() => false)) {
    await collapsed.click({ timeout: 30000 });
    await waitTableSettled(page);
  }
}

async function readVisibleRowKeys(page: Page): Promise<string[]> {
  const rows = page.locator(".ant-table-tbody tr").filter({ has: page.locator("td") });
  const keys: string[] = [];
  const count = await rows.count();
  for (let i = 0; i < count; i += 1) {
    const cells = await rows.nth(i).locator("td").allInnerTexts();
    const normalized = cells.map((cell) => cell.replace(/\s+/g, " ").trim()).filter((cell) => cell.length > 0);
    const key = normalized[0];
    if (key && !["编辑", "新增子层级", "删除"].includes(key)) keys.push(key);
  }
  return [...new Set(keys)];
}

async function collectVisibleKeysAcrossPages(page: Page, maxPages: number): Promise<string[]> {
  const keys: string[] = [];
  for (let pageIndex = 1; pageIndex <= maxPages; pageIndex += 1) {
    keys.push(...(await readVisibleRowKeys(page)));
    const next = page.locator(".ant-pagination-next:visible").last();
    const className = await next.getAttribute("class").catch(() => "");
    if (!className || className.includes("ant-pagination-disabled")) break;
    await next.click({ timeout: 30000 });
    await waitTableSettled(page);
  }
  return [...new Set(keys)];
}

async function stepWithExport(
  page: Page,
  step: (name: string, body: () => Promise<void>, highlight?: Locator) => Promise<void>,
  label: string,
  suffix: string,
): Promise<ExportRows> {
  let exported: ExportRows | null = null;
  await step(label, async () => {
    exported = await exportJsonValidationWorkbook(page, suffix);
    expect(exported.rows.length, `${suffix}: 导出文件应包含数据行`).toBeGreaterThan(0);
  }, page.locator("body"));
  if (!exported) throw new Error(`${suffix}: export did not run`);
  return exported;
}

async function exportJsonValidationWorkbook(page: Page, suffix: string): Promise<ExportRows> {
  const exportButton = page.locator("button").filter({ hasText: /导\s*出/ }).first();
  await expect(exportButton, `${suffix}: 导出按钮应可见`).toBeVisible({ timeout: 30000 });
  await exportButton.click({ timeout: 30000 });

  const popconfirm = page.locator(".ant-popconfirm:visible, .ant-popover:visible").last();
  await expect(popconfirm, `${suffix}: 导出前应展示确认气泡`).toContainText(/请确认.*导出.*数据/, {
    timeout: 30000,
  });

  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 60000 }),
    popconfirm.locator("button").filter({ hasText: /确\s*定/ }).last().click({ timeout: 30000 }),
  ]);
  const suggestedFilename = download.suggestedFilename();
  expect(suggestedFilename, `${suffix}: 导出文件名应为 xlsx`).toMatch(/\.xlsx$/i);
  const downloadPath = path.join(OUT_DIR, `${suffix}-${Date.now()}.xlsx`);
  await download.saveAs(downloadPath);
  expect(fs.existsSync(downloadPath), `${suffix}: 导出文件应保存`).toBe(true);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(downloadPath);
  const worksheet = workbook.worksheets[0];
  expect(workbook.worksheets.length, `${suffix}: xlsx 应包含工作表`).toBeGreaterThan(0);
  const rows = collectWorksheetRows(worksheet);
  const headers = rows[0] ?? [];
  const dataRows = rows.slice(1).filter((row) => row.some((cell) => cell !== ""));
  const keyIndex = columnIndex(headers, "key");
  const rowByKeyMap = new Map<string, string[]>();
  for (const row of dataRows) {
    const key = row[keyIndex] ?? "";
    if (key) rowByKeyMap.set(key, row);
  }

  return { headers, rows: dataRows, rowByKey: rowByKeyMap, downloadPath, suggestedFilename };
}

function collectWorksheetRows(worksheet: ExcelJS.Worksheet): string[][] {
  const rows: string[][] = [];
  const columnCount = Math.max(worksheet.columnCount, EXPECTED_HEADERS.length);
  worksheet.eachRow((row) => {
    const values: string[] = [];
    for (let column = 1; column <= columnCount; column += 1) {
      values[column - 1] = String(row.getCell(column).text ?? "").replace(/\s+/g, " ").trim();
    }
    rows.push(values);
  });
  return rows;
}

function normalizeHeader(value: string): string {
  return value.replace(/\s+/g, "").replace(/\*/g, "").toLowerCase();
}

function columnIndex(headers: string[], header: string): number {
  const target = normalizeHeader(header);
  const index = headers.findIndex((item) => normalizeHeader(item) === target);
  expect(index, `导出文件应包含列 ${header}`).toBeGreaterThanOrEqual(0);
  return index;
}

function expectHeaderOrder(headers: string[]): void {
  const normalizedActual = headers.slice(0, EXPECTED_HEADERS.length).map(normalizeHeader);
  const normalizedExpected = EXPECTED_HEADERS.map(normalizeHeader);
  expect(normalizedActual, "导出文件表头应按预期顺序排列").toEqual(normalizedExpected);
}

function expectExportedKeysExactly(exported: ExportRows, expectedKeys: string[]): void {
  expect([...exported.rowByKey.keys()].sort(), "导出文件 key 集合应精确匹配").toEqual(
    [...expectedKeys].sort(),
  );
}

function expectFileContainsKeys(exported: ExportRows, expectedKeys: string[]): void {
  for (const key of expectedKeys) {
    expect(exported.rowByKey.has(key), `导出文件应包含 ${key}`).toBe(true);
  }
}

function expectCell(exported: ExportRows, key: string, header: string, expectedValue: string): void {
  const row = exported.rowByKey.get(key);
  if (!row) throw new Error(`导出文件应包含 ${key}`);
  const value = row[columnIndex(exported.headers, header)] ?? "";
  expect(value, `${key}.${header} 应正确`).toBe(expectedValue);
}

async function recordEvidence(page: Page, caseId: string, selectedKeys: string[], exported: ExportRows): Promise<void> {
  const evidence: ExportEvidence = {
    caseId,
    route: page.url(),
    selectedKeys,
    exportedKeys: [...exported.rowByKey.keys()],
    downloadPath: exported.downloadPath,
    suggestedFilename: exported.suggestedFilename,
  };
  fs.appendFileSync(EVIDENCE_JSONL, `${JSON.stringify(evidence)}\n`);
  await test.info().attach(`${caseId}.json`, {
    body: JSON.stringify(evidence, null, 2),
    contentType: "application/json",
  });
}
