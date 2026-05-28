// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L4472-L4501
// intent: SR-INTENT-2099-01-STD-022
// probe: results/20260523-1500-mf-standard-definition-01/playwright/ui-probe/snapshot.json
// page: inline standard project bootstrap
// generated_at: 2026-05-23T19:20:00+08:00
// META: {"id":"STD-022","priority":"P2/P3","title":"行业模版列表与引用标准入口只读 Shell 可核验"}
// SourceRefs: SR-2099-01-STD-022, SR-UI-PROBE-20260523-STANDARD-DEF-001
import { expect, type Page } from "@playwright/test";

import { test } from "../../../../_shared/fixtures/step-screenshot";
import { buildDataAssetsUrl } from "../../../../_shared/helpers/test-setup";

const PROJECT_STORAGE_KEY = "X-Valid-Project-ID";
const PROJECT_ID = 92;

test.use({
  storageState:
    process.env.UI_AUTOTEST_SESSION_PATH ??
    "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
});
test.setTimeout(90000);

test("【P2/P3】行业模版列表与引用标准入口只读 Shell 可核验", async ({ page, step }) => {
  await step("步骤1: 进入行业模版页面 → 模板列表、搜索框与引用标准入口可见", async () => {
    await expectStandardIndustryTemplateShell(page, "SR-2099-01-STD-022");
  });
});

async function expectStandardIndustryTemplateShell(page: Page, sourceRef: string): Promise<void> {
  const templateListResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/dmetadata/v1/standardTemplate/list") &&
      response.request().method() === "POST",
    { timeout: 30000 },
  );
  const templateStandardResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/dmetadata/v1/standardTemplate/listDataStandard") &&
      response.request().method() === "POST",
    { timeout: 30000 },
  );

  await gotoStandardPage(page, "/industryTemplate");

  const templateListResponse = await templateListResponsePromise;
  expect(
    templateListResponse.status(),
    `${sourceRef}: 行业模版页应请求模板列表接口且返回 200`,
  ).toBe(200);
  const templateStandardResponse = await templateStandardResponsePromise;
  expect(
    templateStandardResponse.status(),
    `${sourceRef}: 行业模版页应请求模板数据标准接口且返回 200`,
  ).toBe(200);

  const body = page.locator("body");
  for (const label of [
    "行业模版",
    "选择模版",
    "金融行业",
    "引用标准",
    "中文名称",
    "英文名称",
    "标准编号",
    "标准目录",
    "数据类型",
    "业务定义",
  ]) {
    await expect(body, `${sourceRef}: 行业模版页应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }

  await expect(
    page.getByPlaceholder("请输入名称进行搜索").first(),
    `${sourceRef}: 行业模版搜索框应可见`,
  ).toBeVisible({ timeout: 30000 });
  await expect(
    page.getByRole("button", { name: "引用标准" }).first(),
    `${sourceRef}: 引用标准入口应可见但本用例不提交引用`,
  ).toBeVisible({ timeout: 30000 });

  const firstRow = page
    .locator(".ant-table-tbody tr:not(.ant-table-measure-row)")
    .filter({ hasNotText: "暂无数据" })
    .first();
  await expect(firstRow, `${sourceRef}: 行业模版列表应至少展示一条标准模板记录`).toBeVisible({
    timeout: 30000,
  });
  const firstRowText = (await firstRow.innerText()).replace(/\s+/g, " ").trim();
  expect(firstRowText.length, `${sourceRef}: 行业模版首行文本不能为空`).toBeGreaterThan(0);
}

async function gotoStandardPage(page: Page, path: string): Promise<void> {
  await page.addInitScript(
    ([key, projectId]) => {
      sessionStorage.setItem(key, projectId);
    },
    [PROJECT_STORAGE_KEY, String(PROJECT_ID)],
  );
  await page.goto(buildDataAssetsUrl(path, PROJECT_ID), {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.evaluate(
    ([key, projectId]) => {
      sessionStorage.setItem(key, projectId);
    },
    [PROJECT_STORAGE_KEY, String(PROJECT_ID)],
  );
}
