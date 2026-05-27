// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L1347,#L1361,#L1377,#L1403,#L1421,#L1440,#L1455,#L1469,#L1485,#L1511,#L1530,#L1545,#L1559,#L1573,#L1597,#L1616,#L1631,#L1645,#L1659,#L1685,#L1704,#L1719,#L1733,#L1747,#L1773,#L1792
// intent: SR-INTENT-2099-01-MD-NON-TABLE-DETAIL
// probe: data map secondary page and asset detail shell through ltqc-local
// page: inline shell assertions; metadata non-table asset detail entries
// generated_at: 2026-05-27T07:20:00+08:00
// META: {"id":"MD-036","priority":"P1/P2/P3","title":"元数据非表资产详情复制、信息、血缘与属性 Shell 可核验"}
// SourceRefs: SR-2099-01-MD-OFFLINE-COPY-L1347, SR-2099-01-MD-OFFLINE-INFO-L1361, SR-2099-01-MD-OFFLINE-LINEAGE-L1377, SR-2099-01-MD-OFFLINE-INSTANCE-L1403, SR-2099-01-MD-OFFLINE-BASIC-L1421, SR-2099-01-MD-OFFLINE-ATTR-L1440, SR-2099-01-MD-REALTIME-COPY-L1455, SR-2099-01-MD-REALTIME-INFO-L1469, SR-2099-01-MD-REALTIME-LINEAGE-L1485, SR-2099-01-MD-REALTIME-BASIC-L1511, SR-2099-01-MD-REALTIME-ATTR-L1530, SR-2099-01-MD-API-COPY-L1545, SR-2099-01-MD-API-INFO-L1559, SR-2099-01-MD-API-LINEAGE-L1573, SR-2099-01-MD-API-BASIC-L1597, SR-2099-01-MD-API-ATTR-L1616, SR-2099-01-MD-TAG-COPY-L1631, SR-2099-01-MD-TAG-INFO-L1645, SR-2099-01-MD-TAG-LINEAGE-L1659, SR-2099-01-MD-TAG-BASIC-L1685, SR-2099-01-MD-TAG-PUBLISH-L1704, SR-2099-01-MD-INDEX-COPY-L1719, SR-2099-01-MD-INDEX-INFO-L1733, SR-2099-01-MD-INDEX-LINEAGE-L1747, SR-2099-01-MD-INDEX-BASIC-L1773, SR-2099-01-MD-INDEX-ATTR-L1792, SR-UI-PROBE-20260527-MF-METADATA-NON-TABLE-DETAIL-001
import { expect, type Page, type Response } from "@playwright/test";

import { test } from "../../../../_shared/fixtures/step-screenshot";
import { gotoMetadataPage } from "../../../../_shared/pages/2099-01-lt-dq-main-flow/metadata-shell-page";

test.use({
  storageState:
    process.env.UI_AUTOTEST_SESSION_PATH ??
    "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
});
test.setTimeout(180000);

test("【P1/P2/P3】元数据离线任务与实时任务详情复制信息血缘属性可核验", async ({ page, step }) => {
  await step("步骤1: 打开离线任务详情 → 复制、任务信息、血缘、实例分析、基本信息和任务属性入口可见", async () => {
    await openFirstAssetDetail(page, "离线任务", "SR-2099-01-MD-OFFLINE-INFO-L1361");
    await expectTaskLikeDetailShell(
      page,
      "SR-2099-01-MD-OFFLINE-COPY-L1347, SR-2099-01-MD-OFFLINE-INFO-L1361, SR-2099-01-MD-OFFLINE-LINEAGE-L1377, SR-2099-01-MD-OFFLINE-INSTANCE-L1403, SR-2099-01-MD-OFFLINE-BASIC-L1421, SR-2099-01-MD-OFFLINE-ATTR-L1440",
      true,
    );
  });

  await step("步骤2: 打开实时任务详情 → 复制、任务信息、血缘、基本信息和任务属性入口可见", async () => {
    await openFirstAssetDetail(page, "实时任务", "SR-2099-01-MD-REALTIME-INFO-L1469");
    await expectTaskLikeDetailShell(
      page,
      "SR-2099-01-MD-REALTIME-COPY-L1455, SR-2099-01-MD-REALTIME-INFO-L1469, SR-2099-01-MD-REALTIME-LINEAGE-L1485, SR-2099-01-MD-REALTIME-BASIC-L1511, SR-2099-01-MD-REALTIME-ATTR-L1530",
      false,
    );
  });
});

test("【P1/P2/P3】元数据 API 详情复制信息血缘与属性可核验", async ({ page, step }) => {
  await step("步骤1: 打开 API 详情 → API 信息、复制、血缘、基本信息和 API 属性入口可见", async () => {
    await openFirstAssetDetail(page, "API", "SR-2099-01-MD-API-INFO-L1559");
    await expectApiDetailShell(
      page,
      "SR-2099-01-MD-API-COPY-L1545, SR-2099-01-MD-API-INFO-L1559, SR-2099-01-MD-API-LINEAGE-L1573, SR-2099-01-MD-API-BASIC-L1597, SR-2099-01-MD-API-ATTR-L1616",
    );
  });
});

test("【P1/P2/P3】元数据智能标签详情复制信息血缘与发布信息可核验", async ({ page, step }) => {
  await step("步骤1: 打开智能标签详情 → 标签信息、复制、血缘、基本信息和发布信息入口可见", async () => {
    await openFirstAssetDetail(page, "智能标签", "SR-2099-01-MD-TAG-INFO-L1645");
    await expectTagDetailShell(
      page,
      "SR-2099-01-MD-TAG-COPY-L1631, SR-2099-01-MD-TAG-INFO-L1645, SR-2099-01-MD-TAG-LINEAGE-L1659, SR-2099-01-MD-TAG-BASIC-L1685, SR-2099-01-MD-TAG-PUBLISH-L1704",
    );
  });
});

test("【P1/P2/P3】元数据指标详情复制信息血缘与属性可核验", async ({ page, step }) => {
  await step("步骤1: 打开指标详情 → 指标信息、复制、血缘、基本信息和任务属性入口可见", async () => {
    await openFirstAssetDetail(page, "指标", "SR-2099-01-MD-INDEX-INFO-L1733");
    await expectIndexDetailShell(
      page,
      "SR-2099-01-MD-INDEX-COPY-L1719, SR-2099-01-MD-INDEX-INFO-L1733, SR-2099-01-MD-INDEX-LINEAGE-L1747, SR-2099-01-MD-INDEX-BASIC-L1773, SR-2099-01-MD-INDEX-ATTR-L1792",
    );
  });
});

async function openFirstAssetDetail(page: Page, assetType: string, sourceRef: string): Promise<void> {
  await gotoMetadataPage(page, "/metaDataSearch");
  await chooseResultType(page, assetType, sourceRef);

  const queryResponsePromise = waitForQueryDetail(page);
  const searchButton = page.getByRole("button", { name: /查询|搜索/ }).first();
  if (await searchButton.isVisible({ timeout: 5000 })) {
    await searchButton.click();
  } else {
    await page.keyboard.press("Enter");
  }
  const queryResponse = await queryResponsePromise;
  expect(queryResponse.status(), `${sourceRef}: 切换到「${assetType}」后 queryDetail 应返回 200`).toBe(200);

  const firstRow = page.locator(".ant-table-row").first();
  await expect(firstRow, `${sourceRef}: 「${assetType}」查询结果应至少有一行可打开详情`).toBeVisible({
    timeout: 30000,
  });

  const detailResponsePromise = waitForAnyDetail(page);
  const clickableName = firstRow.locator("a, .lighting-text, .meta__name, td").first();
  await clickableName.click();
  const detailResponse = await detailResponsePromise;
  expect(detailResponse.status(), `${sourceRef}: 打开「${assetType}」详情接口应返回 200`).toBe(200);
  await expect(page.locator("body"), `${sourceRef}: 应进入「${assetType}」详情页`).toContainText(
    /详情|基本信息|血缘关系/,
    { timeout: 30000 },
  );
}

async function chooseResultType(page: Page, assetType: string, sourceRef: string): Promise<void> {
  await expect(page.locator("body"), `${sourceRef}: 数据地图二级页应展示查询结果类型筛选`).toContainText(
    "查询结果类型",
    { timeout: 30000 },
  );
  const select = page.locator(".ant-select").first();
  await expect(select, `${sourceRef}: 查询结果类型下拉应可见`).toBeVisible({ timeout: 30000 });
  await select.click();
  const option = page
    .locator(".ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option-content")
    .filter({ hasText: new RegExp(`^${escapeRegExp(assetType)}$`) })
    .first();
  await expect(option, `${sourceRef}: 查询结果类型应包含「${assetType}」`).toBeVisible({ timeout: 15000 });
  await option.click();
}

async function expectTaskLikeDetailShell(page: Page, sourceRef: string, expectInstanceAnalysis: boolean): Promise<void> {
  await expectCommonDetailShell(page, sourceRef, ["任务信息", "任务名称", "任务类型", "责任人", "创建时间", "描述"]);
  await expectCopyAction(page, sourceRef);
  await expectLineageTab(page, sourceRef);
  if (expectInstanceAnalysis) {
    await expectOptionalTab(page, "实例分析", sourceRef);
    await expect(page.locator("body"), `${sourceRef}: 实例分析应展示时间范围或暂无数据`).toContainText(
      /近7天|近1个月|近半年|近1年|暂无数据/,
      { timeout: 30000 },
    );
  }
  await expectSidebarSections(page, sourceRef, ["基本信息", "任务属性"]);
}

async function expectApiDetailShell(page: Page, sourceRef: string): Promise<void> {
  await expectCommonDetailShell(page, sourceRef, ["API信息", "支持格式", "请求协议", "请求方式", "创建时间", "API描述"]);
  await expectCopyAction(page, sourceRef);
  await expectLineageTab(page, sourceRef);
  await expectSidebarSections(page, sourceRef, ["基本信息", "API属性"]);
}

async function expectTagDetailShell(page: Page, sourceRef: string): Promise<void> {
  await expectCommonDetailShell(page, sourceRef, ["标签信息", "标签名称", "标签ID", "所属实体", "标签描述"]);
  await expectCopyAction(page, sourceRef);
  await expectLineageTab(page, sourceRef);
  await expectSidebarSections(page, sourceRef, ["基本信息", "发布信息"]);
}

async function expectIndexDetailShell(page: Page, sourceRef: string): Promise<void> {
  await expectCommonDetailShell(page, sourceRef, ["指标信息", "指标名称", "指标ID", "指标频度", "业务口径", "指标描述"]);
  await expectCopyAction(page, sourceRef);
  await expectLineageTab(page, sourceRef);
  await expectSidebarSections(page, sourceRef, ["基本信息", "任务属性"]);
}

async function expectCommonDetailShell(page: Page, sourceRef: string, labels: readonly string[]): Promise<void> {
  const body = page.locator("body");
  for (const label of labels) {
    await expect(body, `${sourceRef}: 详情页应展示「${label}」`).toContainText(label, { timeout: 30000 });
  }
}

async function expectCopyAction(page: Page, sourceRef: string): Promise<void> {
  const copyEntry = page.locator(".copy, .copy-icon, [class*='copy'], button").filter({ hasText: /复制|Copy/i }).first();
  if (await copyEntry.isVisible({ timeout: 5000 })) {
    await copyEntry.click();
    await expect(page.locator("body"), `${sourceRef}: 点击复制后页面应仍保持详情态`).toContainText(/详情|基本信息/, {
      timeout: 30000,
    });
    return;
  }
  await expect(page.locator("body"), `${sourceRef}: 详情页应提供复制入口或复制按钮文案`).toContainText(/复制|Copy/i, {
    timeout: 30000,
  });
}

async function expectLineageTab(page: Page, sourceRef: string): Promise<void> {
  const lineage = page.getByText("血缘关系", { exact: true }).first();
  await expect(lineage, `${sourceRef}: 详情页应展示血缘关系入口`).toBeVisible({ timeout: 30000 });
  await lineage.click();
  await expect(page.locator("body"), `${sourceRef}: 血缘关系页应展示血缘工具栏或空状态`).toContainText(
    /表级血缘|字段级血缘|展示文字信息|资产类型|导航器|暂无数据|每个节点都可右键查看/,
    { timeout: 30000 },
  );
}

async function expectOptionalTab(page: Page, label: string, sourceRef: string): Promise<void> {
  const tab = page.getByText(label, { exact: true }).first();
  await expect(tab, `${sourceRef}: 详情页应展示「${label}」入口`).toBeVisible({ timeout: 30000 });
  await tab.click();
}

async function expectSidebarSections(page: Page, sourceRef: string, labels: readonly string[]): Promise<void> {
  const body = page.locator("body");
  for (const label of labels) {
    await expect(body, `${sourceRef}: 详情页右侧应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
  await expect(body, `${sourceRef}: 右侧详情应展示资产类型、描述信息、标签或数据目录等字段`).toContainText(
    /资产类型|描述信息|标签|数据目录|所属项目|创建用户|发布人|发布时间/,
    { timeout: 30000 },
  );
}

function waitForQueryDetail(page: Page): Promise<Response> {
  return page.waitForResponse(
    (response) =>
      response.url().includes("/dassets/v1/datamap/queryDetail") &&
      response.request().method() === "POST",
    { timeout: 45000 },
  );
}

function waitForAnyDetail(page: Page): Promise<Response> {
  return page.waitForResponse(
    (response) =>
      response.url().includes("/dassets/v1/") &&
      response.request().method() === "POST" &&
      /detail|lineage|task|api|tag|index|indicator|query/i.test(response.url()),
    { timeout: 45000 },
  );
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
