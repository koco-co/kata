// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L631-L679,#L647-L665
// intent: SR-INTENT-2099-01-MD-016
// probe: results/20260523-1700-mf-metadata-catalog-01/playwright/ui-probe/probe.json
// page: inline shell assertions; metadata shell project bootstrap
// generated_at: 2026-05-23T17:45:00+08:00
// SourceRefs: SR-2099-01-MD-016, SR-UI-PROBE-20260523-MF-METADATA-CATALOG-001, SR-SELF-RUN-20260523-MF-METADATA-SECONDARY-001
import { expect, type Page } from "@playwright/test";

import { test } from "../../../../../../_shared/fixtures/step-screenshot";
import { gotoMetadataPage } from "../../../../../../_shared/pages/2099-01-lt-dq-main-flow/metadata-shell-page";

test.setTimeout(90000);

test("【P3/P1】元数据数据地图二级页筛选与数据目录 Shell 可核验", async ({
  page,
  step,
}) => {
  await step("步骤1: 进入数据地图数据表二级页 → 筛选区、数据目录和排序入口可见", async () => {
    await expectDataMapTableSearchShell(page, "SR-2099-01-MD-016");
  });

  await step("步骤2: 输入非破坏性关键词 → 数据地图查询接口返回且页面保持二级页结构", async () => {
    await expectDataMapKeywordSearchShell(page, "qa_auto", "SR-2099-01-MD-016");
  });
});

async function expectDataMapTableSearchShell(page: Page, sourceRef: string): Promise<void> {
  await gotoMetadataPage(page, "/metaDataSearch");
  const body = page.locator("body");

  for (const label of [
    "数据地图",
    "查询结果类型",
    "数据表",
    "数据源类型",
    "数据源",
    "数据库",
    "负责人",
    "表标签",
    "数据目录",
    "搜索热度",
    "修改时间",
  ]) {
    await expect(body, `${sourceRef}: 数据地图二级页应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }

  await expect(
    page.getByPlaceholder("请输入表名、表中文名、库名、数据源名").first(),
    `${sourceRef}: 数据表搜索框应展示真实 placeholder`,
  ).toBeVisible({ timeout: 30000 });
  await expect(body, `${sourceRef}: 页面应展示订阅按钮`).toContainText(/订\s*阅/, {
    timeout: 30000,
  });
  await expect(body, `${sourceRef}: 页面应展示取消订阅按钮`).toContainText("取消订阅", {
    timeout: 30000,
  });
}

async function expectDataMapKeywordSearchShell(
  page: Page,
  keyword: string,
  sourceRef: string,
): Promise<void> {
  const searchInput = page.getByPlaceholder("请输入表名、表中文名、库名、数据源名").first();
  await expect(searchInput, `${sourceRef}: 数据表搜索框应可输入关键词`).toBeVisible({
    timeout: 30000,
  });

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/dassets/v1/datamap/queryDetail") &&
      response.request().method() === "POST",
    { timeout: 30000 },
  );
  await searchInput.fill(keyword);
  await searchInput.press("Enter");
  const response = await responsePromise;
  expect(response.status(), `${sourceRef}: 数据地图关键词查询接口应返回 200`).toBe(200);

  const body = page.locator("body");
  for (const label of ["查询结果类型", "数据表", "数据目录", "搜索热度", "修改时间"]) {
    await expect(body, `${sourceRef}: 查询后数据地图二级页仍应展示「${label}」`).toContainText(
      label,
      { timeout: 30000 },
    );
  }
}
