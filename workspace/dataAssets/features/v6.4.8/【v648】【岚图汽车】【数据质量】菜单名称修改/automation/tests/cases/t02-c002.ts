// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C002",
  "title": "验证历史项目菜单名称正确修改",
  "steps": [
    {
      "action": "进入「资产-数据质量」页面",
      "expected": "页面正常打开"
    },
    {
      "action": "查看历史项目下的页面菜单",
      "expected": "1）「概览」名称改为「总览」 2）「规则任务配置」名称改为「规则任务管理」 3）「任务实例查询」名称改为「校验结果查询」 4）「质量报告」名称改为「数据质量报告」 5）新增一级菜单「规则集管理」"
    }
  ]
} as const;

test.describe("验证历史项目菜单名称正确修改", () => {
  test("C002 验证历史项目菜单名称正确修改", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
