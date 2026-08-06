// Lindorm 数据资产适配用例的数据质量总览断言。

import { expect, type Page } from "@playwright/test";
import { expectDqPage } from "./page-context";
import { gotoDataQualityPage } from "../../../../../../../_shared/automation/pages/data-quality/project-context";

export async function expectDataQualityOverviewShell(page: Page, sourceRef: string): Promise<void> {
  await expectDqPage(page, sourceRef, {
    path: "/dq/overview",
    labels: [
      "数据质量概览",
      "规则数",
      "规则集总数",
      "规则任务数",
      "校验通过数/校验异常数",
      "规则库分布",
      "校验异常top排名",
      "近期校验异常结果",
      "总览",
      "规则库配置",
      "规则集管理",
      "规则任务管理",
      "校验结果查询",
      "数据质量报告",
    ],
    tableHeaders: [
      "数据表",
      "所属数据库",
      "所属数据源",
      "任务名称",
      "状态",
      "执行周期",
      "计划时间",
      "开始时间",
      "结束时间",
      "操作",
    ],
    apiPaths: [
      "/dassets/v1/valid/monitorOverview/countRecord",
      "/dassets/v1/valid/monitorOverview/getRuleDistribution",
      "/dassets/v1/valid/monitorOverview/listRecentError",
      "/dassets/v1/valid/monitorOverview/countErrorTopRecord",
    ],
  });
}

export async function expectDataQualityMenuRenameContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/overview");

  const dqMenu = page
    .locator(".ant-layout-sider, .ant-menu")
    .filter({ hasText: "规则库配置" })
    .filter({ hasText: "校验结果查询" })
    .last();
  await expect(dqMenu, `${sourceRef}: 数据质量菜单应可见`).toBeVisible({ timeout: 30000 });

  for (const menuName of [
    "规则库配置",
    "规则集管理",
    "规则任务管理",
    "校验结果查询",
    "数据质量报告",
    "通用配置",
    "项目管理",
  ]) {
    await expect(dqMenu, `${sourceRef}: 数据质量菜单应展示新菜单「${menuName}」`).toContainText(
      menuName,
      {
        timeout: 30000,
      },
    );
  }
  for (const legacyName of ["规则配置", "任务查询"]) {
    await expect(
      dqMenu,
      `${sourceRef}: 数据质量主菜单不应展示旧名称「${legacyName}」`,
    ).not.toContainText(legacyName, { timeout: 30000 });
  }

  for (const target of [
    { path: "/dq/ruleBase", url: /\/dq\/ruleBase/, text: "规则库配置" },
    { path: "/dq/ruleSet", url: /\/dq\/ruleSet/, text: "规则集管理" },
    { path: "/dq/rule", url: /\/dq\/rule(?:\?|$)/, text: "规则任务管理" },
    { path: "/dq/taskQuery", url: /\/dq\/taskQuery/, text: "校验结果查询" },
    { path: "/dq/qualityReport", url: /\/dq\/qualityReport/, text: "数据质量报告" },
    {
      path: "/dq/generalConfig/jsonValidationConfig",
      url: /\/dq\/generalConfig\/jsonValidationConfig/,
      text: "通用配置",
    },
    { path: "/dq/project/projectList", url: /\/dq\/project\/projectList/, text: "项目信息" },
    {
      path: "/dq/project/dirtyDataManage",
      url: /\/dq\/project\/dirtyDataManage/,
      text: "脏数据管理",
    },
  ]) {
    await gotoDataQualityPage(page, target.path);
    await expect(page, `${sourceRef}: ${target.text} 应能通过新路由打开`).toHaveURL(target.url);
    await expect(
      page.locator("body"),
      `${sourceRef}: ${target.text} 页面应展示目标菜单/标题`,
    ).toContainText(target.text, { timeout: 30000 });
  }
}

export async function expectMetadataIntegrityShell(page: Page, sourceRef: string): Promise<void> {
  await expectDqPage(page, sourceRef, {
    path: "/integrityAnalysis",
    labels: ["元数据质量", "完整度分析", "质量统计", "统计类型", "质量分析", "分析方式"],
    tableHeaders: ["数据源名称", "数据源类型", "表元数据完整度"],
    apiPaths: [
      "/dassets/v1/metaDataValid/totalRateAnalysis",
      "/dassets/v1/metaDataValid/fillRateByDataSource",
    ],
  });
}
