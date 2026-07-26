// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C330",
  "title": "验证「抽样检查设置」-「抽样设置」交互正确",
  "steps": [
    {
      "action": "进入「数据质量」-「规则任务管理」-「监控对象」页面",
      "expected": "进入成功"
    },
    {
      "action": "开启「抽样检查配置」",
      "expected": "开启成功"
    },
    {
      "action": "勾选「抽样设置」",
      "expected": "勾选成功"
    },
    {
      "action": "取消勾选「抽样设置」",
      "expected": "取消勾选成功"
    },
    {
      "action": "查看「抽样方式下拉选择框」",
      "expected": "展示「绝对数抽样」「百分比抽样」"
    },
    {
      "action": "鼠标hover「？」处",
      "expected": "提示\"抽样方法使用TABLESAMPLE方法，抽样的数量不保证精确，会存在区间波动的情况，例如总数为1000条，抽样10%或者抽样100条，结果会在100条上下波动，可能是95～105\""
    },
    {
      "action": "选择「绝对数抽样」",
      "expected": "右边展示文本输入框"
    },
    {
      "action": "「绝对数抽样」文本框输入内容限制",
      "expected": "仅支持输入正整数"
    },
    {
      "action": "选择「百分比抽样」",
      "expected": "展示文本输入框和%"
    },
    {
      "action": "「百分比抽样」文本框输入内容限制",
      "expected": "仅支持输入数值类数据(支持小数(确认是否仅支持2位小数))"
    }
  ]
} as const;

test.describe("验证「抽样检查设置」-「抽样设置」交互正确", () => {
  test("C330 验证「抽样检查设置」-「抽样设置」交互正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
