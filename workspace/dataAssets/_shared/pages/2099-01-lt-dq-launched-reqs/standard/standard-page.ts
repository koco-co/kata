import { expect, type Page } from "@playwright/test";

import { DataAssetsShellPage } from "../base/data-assets-shell-page";

export type StandardCaseSurface = "definition" | "mapping" | "check";

const ROUTES: Record<StandardCaseSurface, string> = {
  definition: "/dataStandard",
  mapping: "/standardMapping",
  check: "/standardCheck",
};

const SURFACE_EXPECTATIONS: Record<
  StandardCaseSurface,
  {
    readonly routeHash: string;
    readonly bodyTexts: readonly string[];
    readonly buttons: readonly string[];
    readonly tableHeaders: readonly string[];
    readonly placeholders: readonly string[];
  }
> = {
  definition: {
    routeHash: "#/dataStandard",
    bodyTexts: ["标准目录", "已上线", "下线"],
    buttons: ["导出标准", "导入标准", "新建标准"],
    tableHeaders: ["中文名称", "英文名称", "英文缩写", "业务定义", "状态", "创建时间", "操作"],
    placeholders: ["请输入标准名称进行搜索"],
  },
  mapping: {
    routeHash: "#/standardMapping",
    bodyTexts: ["标准目录", "标准映射", "字段绑定", "映射记录", "字段绑定"],
    buttons: ["标准映射"],
    tableHeaders: ["中文名称", "英文名称", "字段绑定(个)", "最近映射时间", "操作"],
    placeholders: ["请输入标准名称进行搜索"],
  },
  check: {
    routeHash: "#/standardCheck",
    bodyTexts: [
      "落标检查总览",
      "检查数据表",
      "标准达标率",
      "检查字段总数",
      "达标字段数",
      "落标检查设置",
      "落标检查结果",
      "暂无数据",
    ],
    buttons: ["新增检查任务", "批量开启", "批量关闭"],
    tableHeaders: [
      "数据表名称",
      "所属数据源",
      "所属数据库",
      "检查字段数/总字段数",
      "检查周期",
      "检查状态",
      "标准达标率",
      "不达标字段数/检查失败数",
      "最近编辑时间",
      "最近检查时间",
      "操作",
    ],
    placeholders: ["请输入数据表名/字段名搜索"],
  },
};

export class StandardPage {
  private readonly shell: DataAssetsShellPage;

  constructor(private readonly page: Page) {
    this.shell = new DataAssetsShellPage(page);
  }

  async expectCaseSurface(surface: StandardCaseSurface, sourceRef: string): Promise<void> {
    const expected = SURFACE_EXPECTATIONS[surface];
    await this.shell.goto(ROUTES[surface], sourceRef);
    await this.shell.expectDomainVisible("standard", sourceRef);
    await expect(this.page, `${sourceRef}: route should stay on ${expected.routeHash}`).toHaveURL(
      new RegExp(`${expected.routeHash.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\?|$)`),
    );

    const body = this.page.locator("body");
    await expect(body, `${sourceRef}: standard page should not show login UI`).not.toContainText(
      /欢迎登录|UIC账号登录|账号登录/,
      { timeout: 10_000 },
    );
    await expect(body, `${sourceRef}: standard route should not show not-found page`).not.toContainText(
      "亲，是不是走错地方了？",
      { timeout: 10_000 },
    );

    for (const text of expected.bodyTexts) {
      await expect(body, `${sourceRef}: body should contain ${text}`).toContainText(text, {
        timeout: 15_000,
      });
    }
    for (const text of expected.buttons) {
      await expect(this.page.getByRole("button", { name: text }), `${sourceRef}: button ${text}`).toBeVisible({
        timeout: 15_000,
      });
    }
    for (const text of expected.tableHeaders) {
      await expect(
        this.page.locator(".ant-table-thead th").filter({ hasText: text }).first(),
        `${sourceRef}: table header ${text}`,
      ).toBeVisible({ timeout: 15_000 });
    }
    for (const text of expected.placeholders) {
      await expect(
        this.page.locator(`input[placeholder="${text}"]`).first(),
        `${sourceRef}: search placeholder ${text}`,
      ).toBeVisible({ timeout: 15_000 });
    }
  }
}
