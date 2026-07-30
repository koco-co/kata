// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L1807,#L1821,#L1837,#L1853,#L1868,#L1883,#L1897,#L1913,#L1935,#L1950,#L1965,#L1979,#L2204,#L2221
// intent: SR-INTENT-2099-01-MD-VIEW-MATERIALIZED-VIEW-DETAIL
// probe: metadata view and materialized view detail shell with dedicated precondition assets
// page: _shared/pages/2099-01-lt-dq-main-flow/metadata-table-detail-page.ts
// generated_at: 2026-05-27T07:32:00+08:00
// META: {"id":"MD-037","priority":"P1/P2/P3","title":"元数据视图与物化视图详情、导出和删除可核验"}
// SourceRefs: SR-2099-01-MD-VIEW-TECH-L1807, SR-2099-01-MD-VIEW-MULTI-SOURCE-L1821, SR-2099-01-MD-VIEW-METADATA-L1837, SR-2099-01-MD-VIEW-EXPORT-L1853, SR-2099-01-MD-VIEW-DELETE-L1868, SR-2099-01-MD-MVIEW-TECH-L1883, SR-2099-01-MD-MVIEW-MULTI-SOURCE-L1897, SR-2099-01-MD-MVIEW-METADATA-L1913, SR-2099-01-MD-MVIEW-EXPORT-L1935, SR-2099-01-MD-MVIEW-DELETE-L1950, SR-2099-01-MD-SYNC-VIEW-L1965, SR-2099-01-MD-SYNC-MVIEW-L1979, SR-2099-01-MD-OFFLINE-VIEW-SYNC-L2204, SR-2099-01-MD-OFFLINE-MVIEW-SYNC-L2221, SR-UI-PROBE-20260527-MF-METADATA-VIEW-DETAIL-001
import { expect, type Locator, type Page } from "@playwright/test";

import { test } from "../../../../../../_shared/fixtures/step-screenshot";
import {
  createDeletableAsset,
  deleteDeletableAsset,
  openFirstTableDetail,
} from "../../../../../../_shared/pages/2099-01-lt-dq-main-flow/metadata-table-detail-page";

test.setTimeout(12 * 60 * 1000);

test("【P1/P2/P3】元数据视图详情技术属性、元数据、导出与删除可核验", async ({ page, step }) => {
  let viewName = "";

  await step("步骤1-3: 创建并同步专属视图，打开视图详情并核验技术属性和源表字段", async () => {
    viewName = await createDeletableAsset(page, "view", "SR-2099-01-MD-SYNC-VIEW-L1965, SR-2099-01-MD-OFFLINE-VIEW-SYNC-L2204");
    await openFirstTableDetail(page, viewName, "SR-2099-01-MD-VIEW-TECH-L1807");
    await expectViewTechnicalShell(
      page,
      viewName,
      "SR-2099-01-MD-VIEW-TECH-L1807, SR-2099-01-MD-VIEW-MULTI-SOURCE-L1821",
    );
  });

  await step("步骤4: 查看表结构字段、建表语句与数据预览 → 视图元数据信息可核验", async () => {
    await expectViewMetadataShell(page, "SR-2099-01-MD-VIEW-METADATA-L1837");
  });

  await step("步骤5: 打开导出元数据弹窗 → 导出确认 Shell 可核验后取消", async () => {
    await expectExportMetadataShell(page, "SR-2099-01-MD-VIEW-EXPORT-L1853");
  });

  await step("步骤6: 删除专属视图元数据 → 数据地图不再展示该专属视图", async () => {
    await deleteDeletableAsset(page, "view", "SR-2099-01-MD-VIEW-DELETE-L1868");
  });
});

test("【P1/P2/P3】元数据物化视图详情技术属性、元数据、导出与删除可核验", async ({ page, step }) => {
  let materializedViewName = "";

  await step("步骤1-3: 创建并同步专属物化视图，打开详情并核验技术属性和源表字段", async () => {
    materializedViewName = await createDeletableAsset(page, "materialized_view", "SR-2099-01-MD-SYNC-MVIEW-L1979, SR-2099-01-MD-OFFLINE-MVIEW-SYNC-L2221");
    await openFirstTableDetail(page, materializedViewName, "SR-2099-01-MD-MVIEW-TECH-L1883");
    await expectViewTechnicalShell(
      page,
      materializedViewName,
      "SR-2099-01-MD-MVIEW-TECH-L1883, SR-2099-01-MD-MVIEW-MULTI-SOURCE-L1897",
    );
  });

  await step("步骤4: 查看字段、建表语句、数据预览与分区入口 → 物化视图元数据信息可核验", async () => {
    await expectViewMetadataShell(page, "SR-2099-01-MD-MVIEW-METADATA-L1913");
  });

  await step("步骤5: 打开导出元数据弹窗 → 导出确认 Shell 可核验后取消", async () => {
    await expectExportMetadataShell(page, "SR-2099-01-MD-MVIEW-EXPORT-L1935");
  });

  await step("步骤6: 删除专属物化视图元数据 → 数据地图不再展示该专属物化视图", async () => {
    await deleteDeletableAsset(page, "materialized_view", "SR-2099-01-MD-MVIEW-DELETE-L1950");
  });
});

async function expectViewTechnicalShell(page: Page, assetName: string, sourceRef: string): Promise<void> {
  await expect(page.locator("body"), `${sourceRef}: 详情页头部应展示专属视图名`).toContainText(assetName, {
    timeout: 30000,
  });
  await clickRightPanel(page, "技术属性", sourceRef);
  const body = page.locator("body");
  for (const label of ["视图名", "源表名", "视图类型"]) {
    await expect(body, `${sourceRef}: 视图技术属性应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
  await expect(body, `${sourceRef}: 视图技术属性不应展示普通表存储大小字段`).not.toContainText("存储大小", {
    timeout: 5000,
  });
}

async function expectViewMetadataShell(page: Page, sourceRef: string): Promise<void> {
  await clickTab(page, "表结构", sourceRef);
  await clickTab(page, "字段", sourceRef);
  const body = page.locator("body");
  for (const label of ["字段名", "字段中文名", "字段描述", "数据类型"]) {
    await expect(body, `${sourceRef}: 视图字段列表应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }

  await clickTab(page, "建表语句", sourceRef);
  await expect(body, `${sourceRef}: 视图建表语句页签应可见`).toContainText(/建表语句|CREATE|暂无数据/, {
    timeout: 30000,
  });

  await clickTab(page, "数据预览", sourceRef);
  await expect(body, `${sourceRef}: 视图数据预览页签应可见`).toContainText(/数据预览|暂无数据|字段/, {
    timeout: 30000,
  });
}

async function expectExportMetadataShell(page: Page, sourceRef: string): Promise<void> {
  await clickButton(page, /导\s*出/, sourceRef);
  const modal = page.locator(".ant-modal:visible, [role='dialog']:visible").first();
  await expect(modal, `${sourceRef}: 导出元数据确认弹窗应可见`).toBeVisible({ timeout: 15000 });
  await expect(modal, `${sourceRef}: 导出弹窗应展示确认文案`).toContainText(/确认导出元数据|导出元数据/, {
    timeout: 10000,
  });
  await closeModal(modal, sourceRef);
}

async function clickRightPanel(page: Page, label: string, sourceRef: string): Promise<void> {
  const panel = page.locator(".detailSidebar, body").getByText(label, { exact: true }).first();
  await expect(panel, `${sourceRef}: 右侧信息面板应展示「${label}」`).toBeVisible({ timeout: 30000 });
  await panel.click();
}

async function clickTab(page: Page, label: string, sourceRef: string): Promise<void> {
  const tab = page.getByRole("tab", { name: new RegExp(label) }).first();
  if (await tab.isVisible({ timeout: 5000 })) {
    await tab.click();
    return;
  }
  const textTab = page.locator(".ant-tabs-tab, button, .ant-segmented-item").filter({ hasText: label }).first();
  await expect(textTab, `${sourceRef}: 应可切换到「${label}」`).toBeVisible({ timeout: 15000 });
  await textTab.click();
}

async function clickButton(page: Page, name: RegExp, sourceRef: string): Promise<void> {
  const button = page.getByRole("button", { name }).first();
  await expect(button, `${sourceRef}: 操作按钮 ${name} 应可见`).toBeVisible({ timeout: 15000 });
  await button.click();
}

async function closeModal(modal: Locator, sourceRef: string): Promise<void> {
  const cancel = modal.getByRole("button", { name: /取\s*消|取消/ }).first();
  if (await cancel.isVisible({ timeout: 5000 })) {
    await cancel.click();
  } else {
    await modal.locator(".ant-modal-close").first().click();
  }
  await expect(modal, `${sourceRef}: 关闭导出弹窗后弹窗应隐藏`).toBeHidden({ timeout: 10000 });
}
