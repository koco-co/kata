// Lindorm 数据资产适配用例的数据质量页面上下文与复用交互。

import { existsSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, type Page } from "@playwright/test";
import ExcelJS from "exceljs";
import type {
  DqRuleSetPageData,
  DqRuleSetRecord,
} from "../../../../../../../_shared/automation/pages/data-quality/contracts";
import { gotoDataQualityPage } from "../../../../../../../_shared/automation/pages/data-quality/project-context";
import { expectNonEmptyString } from "../../../../../../../_shared/automation/pages/data-quality/page-context";

type DqPageTarget = {
  path: string;
  labels: readonly string[];
  tableHeaders?: readonly string[];
  apiPaths?: readonly string[];
};

type DqDownloadArtifact = {
  path: string;
  suggestedName: string;
};

export async function downloadDqArtifactWithSuggestedName(
  page: Page,
  sourceRef: string,
  suffix: string,
  trigger: () => Promise<void>,
): Promise<DqDownloadArtifact> {
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 60000 }),
    trigger(),
  ]);
  const suggestedName = download.suggestedFilename();
  expect(suggestedName, `${sourceRef}: 下载文件名应存在`).not.toBe("");
  const extension = suggestedName.match(/\.[a-zA-Z0-9]+$/)?.[0] ?? ".dat";
  const downloadPath = join(
    tmpdir(),
    `${sourceRef.replace(/[^a-zA-Z0-9_-]/g, "_")}-${suffix}${extension}`,
  );
  await download.saveAs(downloadPath);
  expect(existsSync(downloadPath), `${sourceRef}: 下载文件应保存到本地临时目录`).toBe(true);
  expect(statSync(downloadPath).size, `${sourceRef}: 下载文件不应为空`).toBeGreaterThan(0);
  return { path: downloadPath, suggestedName };
}

export async function expectDownloadedArtifactContains(
  downloadPath: string,
  expectedTokens: string[],
  sourceRef: string,
): Promise<void> {
  const extension = downloadPath.match(/\.[a-zA-Z0-9]+$/)?.[0].toLowerCase();
  let content = "";
  if (extension === ".xlsx" || extension === ".xls") {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(downloadPath);
    content = workbook.worksheets
      .flatMap((sheet) => {
        const values: string[] = [];
        sheet.eachRow((row) => {
          row.eachCell((cell) => values.push(String(cell.value ?? "")));
        });
        return values;
      })
      .join("\n");
  } else {
    content = readFileSync(downloadPath).toString("utf8");
  }
  for (const token of expectedTokens) {
    expect(content, `${sourceRef}: 下载文件内容应包含「${token}」`).toContain(token);
  }
}

export function expectRuleSetPage(pageData: DqRuleSetPageData, message: string): DqRuleSetRecord[] {
  const records = pageData.contentList ?? [];
  expect(Number(pageData.current), `${message}: current 应为数字`).toBeGreaterThan(0);
  expect(Number(pageData.size), `${message}: size 应为数字`).toBeGreaterThan(0);
  expect(Number(pageData.total), `${message}: total 应为数字`).toBeGreaterThanOrEqual(
    records.length,
  );
  expect(records.length, message).toBeGreaterThan(0);
  for (const record of records) {
    expectNonEmptyString(record.tableName, `${message}: 记录应包含表名`);
    expectNonEmptyString(record.schemaName, `${message}: 记录应包含所属数据库`);
    expectNonEmptyString(record.sourceName, `${message}: 记录应包含所属数据源`);
    expect(
      Number(record.packageCount),
      `${message}: 规则包数量应为非负整数`,
    ).toBeGreaterThanOrEqual(0);
    expect(Number(record.ruleCount), `${message}: 规则数量应为非负整数`).toBeGreaterThanOrEqual(0);
  }
  return records;
}

export function expectRuleSetSearchTarget(
  records: DqRuleSetRecord[],
  sourceRef: string,
): DqRuleSetRecord {
  const target =
    records.find((record) => /key_range|json_key/i.test(String(record.tableName ?? ""))) ??
    records.find((record) => Number(record.packageCount) > 0 && Number(record.ruleCount) > 0);
  expect(target, `${sourceRef}: 应存在可搜索并可编辑的规则集记录`).toBeTruthy();
  expect(target?.id, `${sourceRef}: 目标规则集应包含 id`).toBeTruthy();
  expect(Number(target?.packageCount), `${sourceRef}: 目标规则集应包含规则包`).toBeGreaterThan(0);
  expect(Number(target?.ruleCount), `${sourceRef}: 目标规则集应包含规则`).toBeGreaterThan(0);
  return target as DqRuleSetRecord;
}

export async function selectDqFormOption(
  page: Page,
  label: string,
  option: string,
  sourceRef: string,
): Promise<void> {
  const formItem = page.locator(".ant-form-item").filter({ hasText: label }).first();
  await formItem.locator(".ant-select").first().click({ timeout: 30000 });
  const dropdown = page.locator(".ant-select-dropdown:visible").last();
  await expect(dropdown, `${sourceRef}: 「${label}」下拉应包含「${option}」`).toContainText(
    option,
    {
      timeout: 30000,
    },
  );
  await dropdown.getByText(option, { exact: true }).click({ timeout: 30000 });
}

export async function expectDqAdminFullMenu(page: Page, sourceRef: string): Promise<void> {
  await gotoDataQualityPage(page, "/dq/overview");
  const menu = page
    .locator(".ant-layout-sider, .ant-menu")
    .filter({ hasText: "总览" })
    .filter({ hasText: "校验结果查询" })
    .last();
  await expect(menu, `${sourceRef}: 管理员应可看到数据质量菜单`).toBeVisible({ timeout: 30000 });
  for (const menuName of [
    "总览",
    "规则库配置",
    "规则集管理",
    "规则任务管理",
    "校验结果查询",
    "数据质量报告",
    "通用配置",
    "项目管理",
  ]) {
    await expect(menu, `${sourceRef}: 管理员菜单应包含「${menuName}」`).toContainText(menuName, {
      timeout: 30000,
    });
  }
}

export async function expectDqPagePermissionTarget(
  page: Page,
  sourceRef: string,
  options: {
    path: string;
    title: RegExp;
    operations: RegExp;
  },
): Promise<void> {
  await gotoDataQualityPage(page, options.path);
  const body = page.locator("body");
  await expect(body, `${sourceRef}: 管理员应可访问目标权限页面`).toContainText(options.title, {
    timeout: 30000,
  });
  const operation = page
    .locator("button:visible, a:visible")
    .filter({ hasText: options.operations })
    .first();
  await expect(operation, `${sourceRef}: 管理员应展示目标页面操作入口`).toBeVisible({
    timeout: 30000,
  });
}

export async function expectDqLimitedPermission(
  page: Page,
  sourceRef: string,
  options: {
    path: string;
    title: RegExp;
    forbiddenMenu: RegExp;
    operations: RegExp;
  },
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/overview");
  const menu = page
    .locator(".ant-layout-sider, .ant-menu")
    .filter({ hasText: "总览" })
    .filter({ hasText: "校验结果查询" })
    .last();
  await expect(menu, `${sourceRef}: 受限账号应可看到授权菜单`).toContainText(/总览|校验结果查询/, {
    timeout: 30000,
  });
  await expect(menu, `${sourceRef}: 受限账号菜单不应展示未授权入口`).not.toContainText(
    options.forbiddenMenu,
    {
      timeout: 30000,
    },
  );

  await gotoDataQualityPage(page, options.path);
  const body = page.locator("body");
  const bodyText = await body.innerText({ timeout: 30000 });
  if (
    /无权限|权限不足|403|Forbidden|未授权|无权访问/i.test(bodyText) ||
    !options.title.test(bodyText)
  ) {
    expect(
      /无权限|权限不足|403|Forbidden|未授权|无权访问/i.test(bodyText) ||
        !options.title.test(bodyText),
      `${sourceRef}: 受限账号无查看权限时目标页面应不可访问`,
    ).toBe(true);
    return;
  }

  const enabledOperations = page
    .locator("button:not([disabled]):visible, a:visible")
    .filter({ hasText: options.operations });
  await expect(
    enabledOperations,
    `${sourceRef}: 受限账号可查看时新增、编辑、删除等操作入口应不可用`,
  ).toHaveCount(0, { timeout: 30000 });
}

export async function expectDqPage(
  page: Page,
  sourceRef: string,
  target: DqPageTarget,
): Promise<void> {
  await gotoDataQualityPage(page, target.path);
  const body = page.locator("body");

  for (const label of target.labels) {
    await expect(body, `${sourceRef}: ${target.path} 应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }

  for (const header of target.tableHeaders ?? []) {
    await expect(body, `${sourceRef}: ${target.path} 表格应展示列「${header}」`).toContainText(
      header,
      {
        timeout: 30000,
      },
    );
  }

  if (target.apiPaths?.length) {
    await expectDqApiPaths(page, sourceRef, target.path, target.apiPaths);
  }
}

export async function expectDqApiPaths(
  page: Page,
  sourceRef: string,
  target: string,
  apiPaths: readonly string[],
): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(
          (paths) => {
            const urls = performance.getEntriesByType("resource").map((entry) => entry.name);
            return paths.filter((apiPath) => urls.some((url) => url.includes(apiPath)));
          },
          [...apiPaths],
        ),
      {
        message: `${sourceRef}: ${target} 应请求核心数据质量接口`,
        timeout: 30000,
      },
    )
    .toEqual([...apiPaths]);
}

export async function selectDqDateRange(
  page: Page,
  startDate: string,
  endDate: string,
  sourceRef: string,
): Promise<void> {
  await page.getByPlaceholder("开始日期").first().click({ timeout: 30000 });
  await page.locator(`.ant-picker-cell[title="${startDate}"]`).first().click({ timeout: 30000 });
  await page.locator(`.ant-picker-cell[title="${endDate}"]`).first().click({ timeout: 30000 });
  await expect(
    page.getByPlaceholder("开始日期").first(),
    `${sourceRef}: 生成时间开始日期应选中`,
  ).toHaveValue(startDate, { timeout: 30000 });
  await expect(
    page.getByPlaceholder("结束日期").first(),
    `${sourceRef}: 生成时间结束日期应选中`,
  ).toHaveValue(endDate, { timeout: 30000 });
}

export function getRequestJson(request: { postDataJSON(): unknown }): Record<string, unknown> {
  const payload = request.postDataJSON();
  expect(payload, "请求体应为 JSON 对象").toBeTruthy();
  return payload as Record<string, unknown>;
}
