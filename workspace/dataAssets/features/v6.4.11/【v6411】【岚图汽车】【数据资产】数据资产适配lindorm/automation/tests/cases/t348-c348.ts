// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C348",
  "title": "验证【数据质量-菜单名称】历史项目菜单名称正确修改",
  "steps": [
    {
      "action": "进入历史项目的【数据质量】模块",
      "expected": "1)左侧菜单展示「规则库配置」「规则集管理」「规则任务管理」「校验结果查询」「数据质量报告」「通用配置」「项目管理」"
    },
    {
      "action": "检查旧菜单名称对应入口和跳转路由",
      "expected": "1)旧名称「规则配置」「任务查询」不再作为主菜单展示\n2)历史项目路由可正常跳转到新菜单名称页面"
    }
  ]
} as const;

test.describe("验证【数据质量-菜单名称】历史项目菜单名称正确修改", () => {
  test("C348 验证【数据质量-菜单名称】历史项目菜单名称正确修改", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
