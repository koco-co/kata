// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C839",
  "title": "验证「内置规则」-「统计性校验」-「校验方法」前端交互逻辑正确",
  "steps": [
    {
      "action": "进入「资产」-「数据质量」-「规则任务管理」-「规则库配置」页面",
      "expected": "进入成功"
    },
    {
      "action": "将「统计性」-「统计函数」-「异常值检测，IQR离群点数量」「异常值检测，IQR离群点占比」「异常值检测，Z- score置信区间」相关规则均关闭",
      "expected": "关闭成功"
    },
    {
      "action": "进入「规则任务管理」-「监控规则配置页面」，点击「添加规则」下拉框",
      "expected": "不展示「统计性校验」"
    },
    {
      "action": "在「内置规则」中开启任一「统计性」-「统计函数」-「异常值检测，IQR离群点数量」「异常值检测，IQR离群点占比」「异常值检测，Z- score置信区间」相关规则",
      "expected": "开启成功"
    },
    {
      "action": "进入「规则任务管理」-「监控规则配置页面」，添加「统计性校验」规则，选择「统计函数」，点击「校验方法」下拉框",
      "expected": "展示「统计性」-「校验方法」-「异常值检测，IQR离群点数量」「异常值检测，IQR离群点占比」「异常值检测，Z- score置信区间」可选项"
    }
  ]
} as const;

test.describe("验证「内置规则」-「统计性校验」-「校验方法」前端交互逻辑正确", () => {
  test("C839 验证「内置规则」-「统计性校验」-「校验方法」前端交互逻辑正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
