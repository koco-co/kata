// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C286",
  "title": "验证【数据质量-总览】数据质量概览统计卡片展示正确",
  "steps": [
    {
      "action": "进入【数据质量 → 总览】页面",
      "expected": "1)页面展示「数据质量概览」\n2)左侧菜单展示「总览」「规则库配置」「规则集管理」「规则任务管理」「校验结果查询」「数据质量报告」「通用配置」「项目管理」"
    },
    {
      "action": "查看「规则数」「规则集总数」「规则任务数」「校验通过数/校验异常数」统计卡片",
      "expected": "1)四个统计卡片均展示非空数字\n2)统计值与总览接口返回数据一致\n3)最近一次更新时间展示为有效时间格式"
    },
    {
      "action": "核对统计卡片与近期异常列表",
      "expected": "1)统计卡片与近期异常列表数据口径一致\n2)统计卡片不存在空值、负数或 NaN"
    }
  ]
} as const;

test.describe("验证【数据质量-总览】数据质量概览统计卡片展示正确", () => {
  test("C286 验证【数据质量-总览】数据质量概览统计卡片展示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
