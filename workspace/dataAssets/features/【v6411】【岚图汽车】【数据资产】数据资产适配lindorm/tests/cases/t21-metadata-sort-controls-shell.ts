// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L848,#L864
// intent: SR-INTENT-2099-01-MD-021
// probe: results/20260523-1915-mf-metadata-catalog-import-01/playwright/ui-probe/probe.json
// page: inline shell assertions; metadata shell project bootstrap
// generated_at: 2026-05-23T11:15:00Z
// META: {"id":"MD-021","priority":"P2","title":"元数据数据地图搜索热度/修改时间排序接口 Shell 可核验"}
// SourceRefs: SR-2099-01-MD-SORT-SEARCH-HEAT-L848, SR-2099-01-MD-SORT-MODIFIED-TIME-L864, SR-2099-01-MD-021, SR-UI-PROBE-20260523-MF-METADATA-SORT-001, SR-SELF-RUN-20260523-MF-METADATA-SORT-001
import { expect, type Page, type Response } from "@playwright/test";

import { test } from "../../../../_shared/fixtures/step-screenshot";
import { gotoMetadataPage } from "../../../../_shared/pages/2099-01-lt-dq-main-flow/metadata-shell-page";

test.use({
  storageState:
    process.env.UI_AUTOTEST_SESSION_PATH ??
    "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
});
test.setTimeout(120000);

test("【P2】元数据数据地图搜索热度与修改时间排序接口 Shell 可核验", async ({
  page,
  step,
}) => {
  await step("步骤1: 进入数据地图二级页 → 搜索热度与修改时间排序控件可见", async () => {
    await openSortShell(page, "SR-2099-01-MD-021");
  });

  await step("步骤2: 点击搜索热度排序两次 → 查询接口返回 200 且结果列表保持可见", async () => {
    await clickSortAndExpectQuery(page, "搜索热度", "SR-2099-01-MD-SORT-SEARCH-HEAT-L848");
    await clickSortAndExpectQuery(page, "搜索热度", "SR-2099-01-MD-SORT-SEARCH-HEAT-L848");
  });

  await step("步骤3: 点击修改时间排序两次 → 查询接口返回 200 且结果列表保持可见", async () => {
    await clickSortAndExpectQuery(page, "修改时间", "SR-2099-01-MD-SORT-MODIFIED-TIME-L864");
    await clickSortAndExpectQuery(page, "修改时间", "SR-2099-01-MD-SORT-MODIFIED-TIME-L864");
  });
});

async function openSortShell(page: Page, sourceRef: string): Promise<void> {
  const initialQueryPromise = waitForQueryDetail(page);
  await gotoMetadataPage(page, "/metaDataSearch");
  const initialQueryResponse = await initialQueryPromise;
  expect(initialQueryResponse.status(), `${sourceRef}: 数据地图初始查询接口应返回 200`).toBe(200);

  const body = page.locator("body");
  for (const label of ["数据地图", "数据目录", "搜索热度", "修改时间", "当前选中"]) {
    await expect(body, `${sourceRef}: 数据地图二级页应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
  await expectSortControl(page, "搜索热度", sourceRef);
  await expectSortControl(page, "修改时间", sourceRef);
  await expectResultListShell(page, sourceRef);
}

async function clickSortAndExpectQuery(page: Page, label: "搜索热度" | "修改时间", sourceRef: string): Promise<void> {
  const control = await expectSortControl(page, label, sourceRef);
  const responsePromise = waitForQueryDetail(page);
  await control.click();
  const response = await responsePromise;
  expect(response.status(), `${sourceRef}: 点击「${label}」排序后 queryDetail 应返回 200`).toBe(200);
  expect(response.request().method(), `${sourceRef}: 点击「${label}」排序应通过 POST 查询`).toBe("POST");
  await expectResultListShell(page, sourceRef);
}

async function expectSortControl(page: Page, label: "搜索热度" | "修改时间", sourceRef: string) {
  const control = page.getByText(label, { exact: true }).first();
  await expect(control, `${sourceRef}: 「${label}」排序控件应可见`).toBeVisible({ timeout: 30000 });
  return control;
}

async function expectResultListShell(page: Page, sourceRef: string): Promise<void> {
  const body = page.locator("body");
  await expect(body, `${sourceRef}: 排序后结果列表应继续展示数据表资产类型`).toContainText(
    /资产类型：\s*数据表/,
    { timeout: 30000 },
  );
  await expect(body, `${sourceRef}: 排序后分页总数应继续展示`).toContainText(/共\s*\d+\s*条数据/, {
    timeout: 30000,
  });
}

function waitForQueryDetail(page: Page): Promise<Response> {
  return page.waitForResponse(
    (response) =>
      response.url().includes("/dassets/v1/datamap/queryDetail") &&
      response.request().method() === "POST",
    { timeout: 45000 },
  );
}
