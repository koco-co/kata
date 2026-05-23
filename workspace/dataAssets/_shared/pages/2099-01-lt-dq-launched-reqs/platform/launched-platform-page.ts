import { expect, type Page } from "@playwright/test";

import { DataAssetsShellPage } from "../base/data-assets-shell-page";

type SourceRef = string;

export class LaunchedPlatformPage {
  private readonly shell: DataAssetsShellPage;

  constructor(private readonly page: Page) {
    this.shell = new DataAssetsShellPage(page);
  }

  async expectJsonValidationConfig(sourceRef: SourceRef): Promise<void> {
    await this.goto("/dq/generalConfig/jsonValidationConfig", "json格式校验管理", sourceRef);
    await this.expectQualityGeneralConfigMenu(sourceRef);
    await this.expectBodyContains(sourceRef, [
      "json格式校验管理",
      "导 入",
      "导 出",
      "新 增",
      "key",
      "中文名称",
      "value格式",
      "数据源类型",
      "创建人",
      "创建时间",
      "更新人",
      "更新时间",
      "操作",
    ]);
    await expect(
      this.page.locator(".ant-table-tbody, body").first(),
      `${sourceRef}: json validation config should show configured key rows`,
    ).toContainText(/SparkThrift2\.x|Doris3\.x/, { timeout: 30_000 });
  }

  async expectReportDimension(sourceRef: SourceRef, datasource: "hive" | "doris"): Promise<void> {
    await this.goto("/dq/generalConfig/dimension", "报告关联维表设置", sourceRef);
    await this.expectQualityGeneralConfigMenu(sourceRef);
    await this.expectBodyContains(sourceRef, [
      "报告关联维表设置（hive）",
      "报告关联维表设置（doris）",
      "车辆信息关联维表设置",
      "数据源",
      "数据库",
      "数据表",
      "车辆数统计字段",
      "车系关联字段",
      "车型关联字段",
      "动力类型关联字段",
      "保 存",
      "取 消",
    ]);
    await expect(
      this.page.getByText(`报告关联维表设置（${datasource}）`, { exact: true }).first(),
      `${sourceRef}: ${datasource} report dimension tab should be visible`,
    ).toBeVisible({ timeout: 30_000 });
  }

  async expectGeneralConfigMenu(sourceRef: SourceRef): Promise<void> {
    await this.goto("/dq/generalConfig/dimension", "通用配置", sourceRef);
    await this.expectQualityGeneralConfigMenu(sourceRef);
  }

  async expectNotificationCenter(sourceRef: SourceRef): Promise<void> {
    await this.goto("/notificationCenter", "通知中心", sourceRef);
    await this.expectBodyContains(sourceRef, [
      "平台管理",
      "通知中心",
      "通知设置",
      "通知记录",
      "接收人",
      "通知模块",
      "接收人名称",
      "操作",
    ]);
    await expect(
      this.page.getByText("通知记录", { exact: true }).first(),
      `${sourceRef}: notification record tab should be visible`,
    ).toBeVisible({ timeout: 30_000 });
  }

  private async goto(path: string, readyText: string, sourceRef: SourceRef): Promise<void> {
    await this.shell.goto(path, sourceRef);
    await expect(
      this.page.locator("body"),
      `${sourceRef}: ${path} should load ${readyText}`,
    ).toContainText(readyText, { timeout: 45_000 });
  }

  private async expectQualityGeneralConfigMenu(sourceRef: SourceRef): Promise<void> {
    await this.expectBodyContains(sourceRef, [
      "pw_test",
      "数据质量",
      "总览",
      "规则库配置",
      "规则集管理",
      "规则任务管理",
      "校验结果查询",
      "数据质量报告",
      "通用配置",
      "报告关联维表设置",
      "json格式校验管理",
      "项目管理",
    ]);
  }

  private async expectBodyContains(sourceRef: SourceRef, texts: readonly string[]): Promise<void> {
    const body = this.page.locator("body");
    for (const text of texts) {
      await expect(body, `${sourceRef}: page should show "${text}"`).toContainText(text, {
        timeout: 30_000,
      });
    }
  }
}
