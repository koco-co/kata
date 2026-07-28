// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0290",
  "title": "验证【数据质量-总览】近期校验异常结果查看详情跳转正确",
  "steps": [
    {
      "action": "进入【数据质量 → 总览】页面",
      "expected": "1)页面展示「数据质量概览」\n2)左侧菜单展示「总览」「规则库配置」「规则集管理」「规则任务管理」「校验结果查询」「数据质量报告」「通用配置」「项目管理」"
    },
    {
      "action": "点击「近期校验异常结果」中的「查看更多」或任务行「查看详情」",
      "expected": "1)点击「查看更多」跳转至【校验结果查询】\n2)点击「查看详情」进入对应实例详情并展示任务名称、状态和规则结果"
    }
  ]
} as const;

test.describe("验证【数据质量-总览】近期校验异常结果查看详情跳转正确", () => {
  test("C0290 验证【数据质量-总览】近期校验异常结果查看详情跳转正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
