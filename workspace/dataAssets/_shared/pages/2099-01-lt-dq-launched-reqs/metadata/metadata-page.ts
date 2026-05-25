import { expect, type Page } from "@playwright/test";

import { DataAssetsShellPage } from "../base/data-assets-shell-page";

export type MetadataCaseSurface =
  | "dataMap"
  | "metadataManage"
  | "metadataSync"
  | "metaModelManage"
  | "subscription";

type SurfaceExpectation = {
  readonly route: string;
  readonly routeHash: string;
  readonly bodyTexts: readonly string[];
  readonly buttons: readonly string[];
  readonly tableHeaders: readonly string[];
  readonly placeholders: readonly string[];
  readonly sourceRef: string;
};

const SURFACE_EXPECTATIONS: Record<MetadataCaseSurface, SurfaceExpectation> = {
  dataMap: {
    route: "/metaDataCenter",
    routeHash: "#/metaDataCenter",
    sourceRef: "src.ui.metadata.retry2-metadata-center@1",
    bodyTexts: ["数据地图", "数据表", "字段", "表来源", "SparkThrift2.x", "Doris3.x"],
    buttons: ["清空"],
    tableHeaders: [],
    placeholders: ["请输入表名、表中文名、库名、数据源名"],
  },
  metadataManage: {
    route: "/manageTables",
    routeHash: "#/manageTables",
    sourceRef: "src.ui.metadata.retry2-menu-元数据管理@1",
    bodyTexts: ["元数据管理"],
    buttons: [],
    tableHeaders: ["数据源", "数据库数量", "数据表数量", "数据源类型", "表生命周期", "更新时间"],
    placeholders: ["请输入数据源名称"],
  },
  metadataSync: {
    route: "/metaDataSync",
    routeHash: "#/metaDataSync",
    sourceRef: "src.ui.metadata.retry2-menu-元数据同步@1",
    bodyTexts: ["元数据同步"],
    buttons: [],
    tableHeaders: [],
    placeholders: [],
  },
  metaModelManage: {
    route: "/metaModelManage",
    routeHash: "#/metaModelManage",
    sourceRef: "src.ui.metadata.retry2-menu-元模型管理@1",
    bodyTexts: ["元模型管理"],
    buttons: [],
    tableHeaders: [],
    placeholders: [],
  },
  subscription: {
    route: "/subscribeDatas",
    routeHash: "#/subscribeDatas",
    sourceRef: "src.ui.metadata.retry2-menu-订阅的数据@1",
    bodyTexts: ["订阅的数据", "当前选中"],
    buttons: ["取消订阅", "修改提醒方式"],
    tableHeaders: ["表名", "表中文名", "数据路径", "提醒方式", "订阅时间"],
    placeholders: ["请输入表名/表中文名搜索"],
  },
};

export class MetadataPage {
  private readonly shell: DataAssetsShellPage;

  constructor(private readonly page: Page) {
    this.shell = new DataAssetsShellPage(page);
  }

  async expectCaseSurface(surface: MetadataCaseSurface, sourceRef: string): Promise<void> {
    const expected = SURFACE_EXPECTATIONS[surface];
    await this.shell.goto(expected.route, `${sourceRef} -> ${expected.sourceRef}`);
    await this.shell.expectDomainVisible("metadata", sourceRef);
    await expect(this.page, `${sourceRef}: route should stay on ${expected.routeHash}`).toHaveURL(
      new RegExp(`${expected.routeHash.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\?|$)`),
    );

    const body = this.page.locator("body");
    await expect(body, `${sourceRef}: metadata page should not show login UI`).not.toContainText(
      /欢迎登录|UIC账号登录|账号登录/,
      { timeout: 10_000 },
    );
    await expect(body, `${sourceRef}: metadata route should not show not-found page`).not.toContainText(
      "亲，是不是走错地方了？",
      { timeout: 10_000 },
    );

    for (const text of expected.bodyTexts) {
      await expect(body, `${sourceRef}: body should contain ${text}`).toContainText(text, {
        timeout: 30_000,
      });
    }
    for (const text of expected.buttons) {
      await expect(this.page.getByRole("button", { name: text }).first(), `${sourceRef}: button ${text}`).toBeVisible(
        { timeout: 15_000 },
      );
    }
    for (const text of expected.tableHeaders) {
      await expect(
        this.page.locator(".ant-table-thead th").filter({ hasText: text }).first(),
        `${sourceRef}: table header ${text}`,
      ).toBeVisible({ timeout: 15_000 });
    }
    for (const text of expected.placeholders) {
      await expect(
        this.page.locator(`input[placeholder="${text}"], textarea[placeholder="${text}"]`).first(),
        `${sourceRef}: placeholder ${text}`,
      ).toBeVisible({ timeout: 15_000 });
    }
  }
}
