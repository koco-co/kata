// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0953",
  "title": "验证「已配置报告」-查看报告功能正常",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【数据质量报告】页面",
      "expected": "成功进入「已配置报告」页面"
    },
    {
      "action": "选择一条单表报告名称为${name1}的报告记录, 点击「查看报告」按钮",
      "expected": "1) 跳转到「已生成报告」页面\n2) 「报告名」中默认代入${name1}, 并进行报告查询"
    },
    {
      "action": "选择一条自定义报告名称为${name2}的报告记录, 点击「查看报告」按钮",
      "expected": "1) 跳转到「已生成报告」页面\n2) 「报告名」中默认代入${name2}, 并进行报告查询"
    }
  ]
} as const;

test.describe("验证「已配置报告」-查看报告功能正常", () => {
  test("C0953 验证「已配置报告」-查看报告功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
