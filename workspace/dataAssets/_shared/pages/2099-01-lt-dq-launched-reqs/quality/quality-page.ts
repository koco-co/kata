import { expect, type Page } from "@playwright/test";

import { DataAssetsShellPage } from "../base/data-assets-shell-page";

export type QualityCaseSurface =
  | "overview"
  | "ruleBase"
  | "ruleSet"
  | "rule"
  | "taskQuery"
  | "qualityReport";

type SurfaceExpectation = {
  readonly route: string;
  readonly routeHash: string;
  readonly bodyTexts: readonly string[];
  readonly buttons: readonly string[];
  readonly tableHeaders: readonly string[];
  readonly placeholders: readonly string[];
};

const SURFACE_EXPECTATIONS: Record<QualityCaseSurface, SurfaceExpectation> = {
  overview: {
    route: "/dq/overview",
    routeHash: "#/dq/overview",
    bodyTexts: ["数据质量概览", "规则数", "规则集总数", "规则任务数", "校验通过数/校验异常数"],
    buttons: ["查看更多", "查看详情"],
    tableHeaders: [
      "排名",
      "数据表",
      "所属数据库",
      "所属数据源",
      "校验任务数",
      "校验失败/不通过数",
      "最近一次校验时间",
    ],
    placeholders: [],
  },
  ruleBase: {
    route: "/dq/ruleBase",
    routeHash: "#/dq/ruleBase",
    bodyTexts: ["规则库配置"],
    buttons: ["导出规则库"],
    tableHeaders: ["规则名称", "规则解释", "规则分类", "关联范围", "关联规则数", "规则状态", "规则描述"],
    placeholders: ["请输入规则名称进行搜索"],
  },
  ruleSet: {
    route: "/dq/ruleSet",
    routeHash: "#/dq/ruleSet",
    bodyTexts: ["规则集管理"],
    buttons: ["新建规则集"],
    tableHeaders: ["表名", "所属数据库", "所属数据源", "规则包数量", "规则数量", "规则集描述", "操作"],
    placeholders: ["输入表名搜索"],
  },
  rule: {
    route: "/dq/rule",
    routeHash: "#/dq/rule",
    bodyTexts: ["规则任务管理"],
    buttons: ["新建监控规则", "开启检测", "关闭检测"],
    tableHeaders: ["表", "任务名称", "数据源", "执行周期", "规则状态", "是否关联任务", "操作"],
    placeholders: ["输入表名搜索"],
  },
  taskQuery: {
    route: "/dq/taskQuery",
    routeHash: "#/dq/taskQuery",
    bodyTexts: ["校验结果查询"],
    buttons: [],
    tableHeaders: [
      "表",
      "任务名称",
      "状态",
      "数据源",
      "执行周期",
      "是否关联任务",
      "计划时间",
      "开始时间",
      "结束时间",
      "运行时长",
      "提交人",
      "最近修改人",
      "操作",
    ],
    placeholders: ["请输入表名/任务名称搜索", "开始日期", "结束日期"],
  },
  qualityReport: {
    route: "/dq/qualityReport",
    routeHash: "#/dq/qualityReport",
    bodyTexts: ["数据质量报告"],
    buttons: [],
    tableHeaders: [],
    placeholders: [],
  },
};

export class QualityPage {
  private readonly shell: DataAssetsShellPage;

  constructor(private readonly page: Page) {
    this.shell = new DataAssetsShellPage(page);
  }

  async expectCaseSurface(surface: QualityCaseSurface, sourceRef: string): Promise<void> {
    const expected = SURFACE_EXPECTATIONS[surface];
    await this.shell.goto(expected.route, sourceRef);
    await this.shell.expectDomainVisible("quality", sourceRef);
    await expect(this.page, `${sourceRef}: route should stay on ${expected.routeHash}`).toHaveURL(
      new RegExp(`${expected.routeHash.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\?|$)`),
    );

    const body = this.page.locator("body");
    await expect(body, `${sourceRef}: quality page should not show login UI`).not.toContainText(
      /欢迎登录|UIC账号登录|账号登录/,
      { timeout: 10_000 },
    );
    await expect(body, `${sourceRef}: quality route should not show not-found page`).not.toContainText(
      "亲，是不是走错地方了？",
      { timeout: 10_000 },
    );

    for (const text of expected.bodyTexts) {
      await expect(body, `${sourceRef}: body should contain ${text}`).toContainText(text, {
        timeout: 15_000,
      });
    }
    for (const text of expected.buttons) {
      await expect(this.page.getByRole("button", { name: text }).first(), `${sourceRef}: button ${text}`).toBeVisible(
        {
          timeout: 15_000,
        },
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
