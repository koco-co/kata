// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0949",
  "title": "验证「已生成报告」-数据表筛选",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【数据质量报告】页面",
      "expected": "成功进入「已配置报告」页面"
    },
    {
      "action": "点击「已生成报告」页签",
      "expected": "成功切换到「已生成报告」"
    },
    {
      "action": "在「数据表」输入关键字${table}, 点击「查询」",
      "expected": "1) 输入前: 输入框置灰提示「请输入数据表搜索」2)输入后: 显示「关联数据表」包含${table}的记录"
    },
    {
      "action": "点击「重置」",
      "expected": "显示全部记录"
    }
  ]
} as const;

test.describe("验证「已生成报告」-数据表筛选", () => {
  test("C0949 验证「已生成报告」-数据表筛选", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
