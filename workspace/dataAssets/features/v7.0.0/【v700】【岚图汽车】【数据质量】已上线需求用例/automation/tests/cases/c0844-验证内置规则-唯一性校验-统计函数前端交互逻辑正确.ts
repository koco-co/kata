// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0844",
  "title": "验证「内置规则」-「唯一性校验」-「统计函数」前端交互逻辑正确",
  "steps": [
    {
      "action": "进入「资产」-「数据质量」-「规则任务管理」-「规则库配置」页面",
      "expected": "进入成功"
    },
    {
      "action": "将「唯一性」-「统计函数」-「重复数」「重复率」「多表唯一性判断」相关规则均关闭",
      "expected": "关闭成功"
    },
    {
      "action": "进入「规则任务管理」-「监控规则配置页面」，点击「添加规则」下拉框",
      "expected": "不展示「唯一性校验」可选项"
    },
    {
      "action": "在「内置规则」中开启任一「唯一性」-「统计函数」-「重复数」「重复率」「多表唯一性判断」相关规则",
      "expected": "开启成功"
    },
    {
      "action": "进入「规则任务管理」-「监控规则配置页面」，添加「唯一性校验」规则，点击「统计函数」下拉框",
      "expected": "展示「统计函数」-「重复数」「重复率」「多表唯一性判断」可选项"
    }
  ]
} as const;

test.describe("验证「内置规则」-「唯一性校验」-「统计函数」前端交互逻辑正确", () => {
  test("C0844 验证「内置规则」-「唯一性校验」-「统计函数」前端交互逻辑正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
