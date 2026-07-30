// Lindorm 数据资产适配用例的规则集页面流程与断言。

import { expect, type Page } from "@playwright/test";
import { expectDqApiPaths, expectDqPage } from "./page-context";
import { gotoDataQualityPage } from "../../../../../../../_shared/automation/pages/data-quality/project-context";
import { clickDqText } from "../../../../../../../_shared/automation/pages/data-quality/page-context";

export async function expectDataQualityRuleSetShell(page: Page, sourceRef: string): Promise<void> {
  await expectDqPage(page, sourceRef, {
    path: "/dq/ruleSet",
    labels: ["规则集管理", "新建规则集"],
    tableHeaders: [
      "表名",
      "所属数据库",
      "所属数据源",
      "规则包数量",
      "规则数量",
      "规则集描述",
      "更新人",
      "更新时间",
      "操作",
    ],
    apiPaths: ["/dassets/v1/valid/monitorRuleSet/pageQuery"],
  });
}

export async function expectDataQualityRuleSetCreateEntry(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/ruleSet");
  await clickDqText(page, "新建规则集", sourceRef);
  await expect(page, `${sourceRef}: 新建规则集应进入 /dq/ruleSet/add`).toHaveURL(
    /\/dq\/ruleSet\/add/,
  );

  const body = page.locator("body");
  for (const label of [
    "新增规则集",
    "基础信息",
    "选择数据源",
    "选择数据库",
    "选择数据表",
    "规则包名称",
    "下一步",
  ]) {
    await expect(body, `${sourceRef}: 新建规则集页面应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }

  await expectDqApiPaths(page, sourceRef, "/dq/ruleSet 新建规则集", [
    "/dassets/v1/valid/project/getDefaultMonitorDatasource",
  ]);
}

export async function expectDataQualityRuleSetFilterContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/ruleSet");

  const body = page.locator("body");
  await expect(body, `${sourceRef}: 规则集管理应展示新建规则集入口`).toContainText("新建规则集", {
    timeout: 30000,
  });
  await expect(
    page.getByPlaceholder("输入表名搜索").first(),
    `${sourceRef}: 规则集管理应展示表名搜索输入框`,
  ).toBeVisible({ timeout: 30000 });

  for (const header of [
    "表名",
    "所属数据库",
    "所属数据源",
    "规则包数量",
    "规则数量",
    "规则集描述",
    "更新人",
    "更新时间",
    "操作",
  ]) {
    await expect(body, `${sourceRef}: 规则集管理列表应展示列「${header}」`).toContainText(header, {
      timeout: 30000,
    });
  }

  await expectDqApiPaths(page, sourceRef, "/dq/ruleSet 筛选列表", [
    "/dassets/v1/valid/monitorRuleSet/pageQuery",
  ]);
}
