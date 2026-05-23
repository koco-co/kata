import { expect, type Locator, type Page } from "@playwright/test";

import { DataAssetsShellPage } from "../base/data-assets-shell-page";

export class LaunchedAssetsPage {
  private readonly shell: DataAssetsShellPage;

  constructor(private readonly page: Page) {
    this.shell = new DataAssetsShellPage(page);
  }

  async gotoDataMap(sourceRef: string): Promise<void> {
    await this.shell.goto("/metaDataCenter", sourceRef);
    await expect(this.page.getByText("数据地图", { exact: true }).first()).toBeVisible({
      timeout: 30_000,
    });
  }

  async openFieldResults(sourceRef: string): Promise<void> {
    await this.page.getByText("字段", { exact: true }).first().click();
    await expect(this.page, `${sourceRef}: clicking field asset type should open field results`).toHaveURL(
      /#\/metaDataSearch/,
      { timeout: 30_000 },
    );
    await expect(this.page.locator("body")).toContainText("是否开启模糊匹配", { timeout: 30_000 });
  }

  async expectFieldResultCatalogShell(sourceRef: string): Promise<void> {
    const body = this.page.locator("body");
    for (const text of ["字段", "数据目录", "数据源类型(4)", "请选择数据源类型"]) {
      await expect(body, `${sourceRef}: field result shell should expose ${text}`).toContainText(text, {
        timeout: 30_000,
      });
    }
  }

  async expectCurrentFieldRows(sourceRef: string, totalText: RegExp): Promise<void> {
    const body = this.page.locator("body");
    await expect(body, `${sourceRef}: field result list should show current rows`).toContainText(totalText, {
      timeout: 30_000,
    });
    await expect(body, `${sourceRef}: field result list should include field rows`).toContainText(/id|score|category/, {
      timeout: 30_000,
    });
  }

  async gotoMetadataSync(sourceRef: string): Promise<void> {
    await this.shell.goto("/metaDataSync", sourceRef);
    const body = this.page.locator("body");
    for (const text of ["元数据同步", "周期同步", "新增周期同步任务"]) {
      await expect(body, `${sourceRef}: metadata sync page should expose ${text}`).toContainText(text, {
        timeout: 30_000,
      });
    }
  }

  async openFirstSparkMetadataSyncEditSchedule(sourceRef: string, dataSourceName: string): Promise<void> {
    await expect(this.page.locator("body"), `${sourceRef}: spark sync task should exist`).toContainText(
      dataSourceName,
      { timeout: 30_000 },
    );
    await this.page.getByText("编辑", { exact: true }).first().click();
    await expect(this.page.locator("body")).toContainText("编辑周期同步任务", { timeout: 30_000 });
    await this.page.getByRole("button", { name: "下一步" }).click();
    await expect(this.page.locator("body")).toContainText("调度配置", { timeout: 30_000 });
  }

  async expectMetadataEnvironmentConfigButton(sourceRef: string): Promise<void> {
    await expect(
      this.page.getByRole("button", { name: "环境参数配置" }),
      `${sourceRef}: Spark metadata sync schedule should expose environment parameter config`,
    ).toBeVisible({ timeout: 30_000 });
  }

  async openMetadataEnvironmentConfigDialog(sourceRef: string): Promise<void> {
    await this.page.getByRole("button", { name: "环境参数配置" }).click();
    await expect(this.overlay(), `${sourceRef}: environment parameter dialog should open`).toContainText(
      /环境参数|Spark|spark/i,
      { timeout: 30_000 },
    );
  }

  async gotoStandardCheck(sourceRef: string): Promise<void> {
    await this.shell.goto("/standardCheck", sourceRef);
    const body = this.page.locator("body");
    for (const text of ["落标检查", "落标检查设置", "新增检查任务"]) {
      await expect(body, `${sourceRef}: standard check page should expose ${text}`).toContainText(text, {
        timeout: 30_000,
      });
    }
  }

  async openNewStandardCheckTask(sourceRef: string): Promise<void> {
    await this.page.getByRole("button", { name: "新增检查任务" }).click();
    await expect(this.page, `${sourceRef}: new standard check task route should open`).toHaveURL(
      /#\/standardCheck\/addTask/,
      { timeout: 30_000 },
    );
    await expect(this.page.locator("body")).toContainText("检查内容", { timeout: 30_000 });
  }

  async expectStandardCheckSparkEntry(sourceRef: string): Promise<void> {
    const body = this.page.locator("body");
    for (const text of ["数据源", "请选择数据源", "数据库", "数据表", "下一步"]) {
      await expect(body, `${sourceRef}: standard check add form should expose ${text}`).toContainText(text, {
        timeout: 30_000,
      });
    }
  }

  private overlay(): Locator {
    return this.page.locator(".ant-modal, .ant-drawer, .ant-popover, body").last();
  }
}
