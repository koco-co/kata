// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1061",
  "title": "验证新建项目菜单名称正确修改",
  "steps": [
    {
      "action": "进入「资产-数据质量」页面",
      "expected": "页面正常打开"
    },
    {
      "action": "新建项目信息，并切换对应项目",
      "expected": "项目新建成功，切换对应项目的页面"
    },
    {
      "action": "查看页面菜单",
      "expected": "1）「概览」名称改为「总览」\n2）「规则任务管理」名称改为「规则任务管理」\n3）「校验结果查询」名称改为「校验结果查询」\n4）【数据质量报告】名称改为「数据质量报告」\n5）新增一级菜单「规则集管理」"
    }
  ]
} as const;

test.describe("验证新建项目菜单名称正确修改", () => {
  test("C1061 验证新建项目菜单名称正确修改", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
