// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0986",
  "title": "验证编辑不限制「超时时间」为自定义，功能正确",
  "steps": [
    {
      "action": "进入「资产-数据质量」页面",
      "expected": "页面正常打开"
    },
    {
      "action": "选择「规则A」，点击编辑，进入「调度属性」页",
      "expected": "页面正常打开"
    },
    {
      "action": "查看「超时时间」区域",
      "expected": "显示为「不限制」"
    },
    {
      "action": "编辑「超时时间」选择「自定义」",
      "expected": "弹出时间配置框，可配置小时、分钟"
    },
    {
      "action": "配置为：00时05分，保存规则，且「调度属性」中配置「规则报告」为最新结果",
      "expected": "规则保存成功"
    },
    {
      "action": "临时运行规则，查看实例详情及质量报告",
      "expected": "运行时间超过5分钟，该任务被自动杀掉，不再运行，未生成质量报告"
    },
    {
      "action": "查看任务状态",
      "expected": "显示为\"中途停止\""
    }
  ]
} as const;

test.describe("验证编辑不限制「超时时间」为自定义，功能正确", () => {
  test("C0986 验证编辑不限制「超时时间」为自定义，功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
