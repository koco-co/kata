// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0842",
  "title": "验证「内置规则」-「有效性校验」-「统计函数」前端交互逻辑正确",
  "steps": [
    {
      "action": "进入「资产」-「数据质量」-「规则任务管理」-「规则库配置」页面",
      "expected": "进入成功"
    },
    {
      "action": "将「有效性」-「统计函数」-「数值取值范围」「数值枚举个数」「格式校验」「字段长度」「数据精度」「枚举值」「NULL值检测」「重复值检测」相关规则均关闭",
      "expected": "关闭成功"
    },
    {
      "action": "进入「规则任务管理」-「监控规则配置页面」，点击「添加规则」下拉框",
      "expected": "不展示「有效性校验」选项"
    },
    {
      "action": "在「内置规则」中开启任一「有效性」-「统计函数」-「数值取值范围」「数值枚举个数」「格式校验」「字段长度」「数据精度」「枚举值」「NULL值检测」「重复值检测」相关规则",
      "expected": "开启成功"
    },
    {
      "action": "进入「规则任务管理」-「监控规则配置页面」，添加「有效性校验」规则，点击「统计函数」下拉框",
      "expected": "展示「有效性」-「统计函数」-「数值取值范围」「数值枚举个数」「格式校验」「字段长度」「数据精度」「枚举值」「NULL值检测」「重复值检测」可选项"
    }
  ]
} as const;

test.describe("验证「内置规则」-「有效性校验」-「统计函数」前端交互逻辑正确", () => {
  test("C0842 验证「内置规则」-「有效性校验」-「统计函数」前端交互逻辑正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
