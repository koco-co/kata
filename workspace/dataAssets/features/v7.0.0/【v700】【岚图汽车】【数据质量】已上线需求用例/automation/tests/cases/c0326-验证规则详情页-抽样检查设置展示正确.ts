// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0326",
  "title": "验证「规则详情页」-「抽样检查设置」展示正确",
  "steps": [
    {
      "action": "进入「数据质量」-「规则任务管理」页面",
      "expected": "进入成功"
    },
    {
      "action": "点击规则A，查看规则A详情信息",
      "expected": "「基本信息」下展示「抽样检查设置」内容"
    },
    {
      "action": "编辑规则A，修改「字段内容去重设置」「过滤条件设置」「抽样设置」，保存规则",
      "expected": "编辑成功"
    },
    {
      "action": "再次点击规则A，查看规则A详情信息",
      "expected": "「基本信息」下展示「抽样检查设置」编辑后内容"
    },
    {
      "action": "编辑规则A，关闭「抽样检查设置」，保存任务",
      "expected": "保存成功"
    },
    {
      "action": "再次点击规则A，查看规则A详情信息",
      "expected": "「基本信息」下展示「抽样检查设置」，内容为「关闭」"
    }
  ]
} as const;

test.describe("验证「规则详情页」-「抽样检查设置」展示正确", () => {
  test("C0326 验证「规则详情页」-「抽样检查设置」展示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
