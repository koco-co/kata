// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0971",
  "title": "验证【「已配置报告」】「新建报告」-报告名称UI交互正确",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【数据质量报告】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击「新建报告」按钮",
      "expected": "弹出「新建报告」弹窗"
    },
    {
      "action": "「报告名称」为空, 点击确定",
      "expected": "1) 确定前: 输入框置灰提示「请输入报告名称」\n2) 确定后: 输入框下方置红提示「请输入报告名称」"
    },
    {
      "action": "「报告名称」输入重名字符, 点击确定",
      "expected": "提示「报告名称不能重复」"
    },
    {
      "action": "「报告名称」输入超过255个字符，点击确定",
      "expected": "置红提示「报告名称最大支持255个字符」"
    },
    {
      "action": "「报告名称」输入255个字符以内，仅包含空格，点击确定",
      "expected": "置红提示「请输入报告名称」"
    },
    {
      "action": "「报告名称」输入255个字符以内，且包含特殊字符（标点、字母、数字、空格），点击确定",
      "expected": "输入框正常显示输入内容，无错误提示"
    }
  ]
} as const;

test.describe("验证【「已配置报告」】「新建报告」-报告名称UI交互正确", () => {
  test("C0971 验证【「已配置报告」】「新建报告」-报告名称UI交互正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
