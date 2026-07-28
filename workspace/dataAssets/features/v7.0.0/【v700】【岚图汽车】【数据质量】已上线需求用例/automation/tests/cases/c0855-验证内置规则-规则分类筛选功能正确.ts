// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0855",
  "title": "验证「内置规则」-「规则分类」筛选功能正确",
  "steps": [
    {
      "action": "进入「资产」-「数据质量」-「规则任务管理」-「规则库配置」页面",
      "expected": "进入成功"
    },
    {
      "action": "点击「规则分类」筛选框",
      "expected": "筛选框选项展示「完整性」「唯一性」「有效性」「统计性」"
    },
    {
      "action": "选择「完整性」，确认",
      "expected": "仅展示「完整性」相关规则"
    },
    {
      "action": "选择「唯一性」，确认",
      "expected": "仅展示「唯一性」相关规则"
    },
    {
      "action": "选择「有效性」，确认",
      "expected": "仅展示「有效性」相关规则"
    },
    {
      "action": "选择「统计性」，确认",
      "expected": "仅展示「统计性」相关规则"
    },
    {
      "action": "选择「完整性」「统计性」，确认",
      "expected": "展示「完整性」+「统计性」相关规则"
    },
    {
      "action": "选择「唯一性」「有效性」，确认",
      "expected": "展示「唯一性」+「有效性」相关规则"
    },
    {
      "action": "选择「完整性」「唯一性」「有效性」「统计性」，确认",
      "expected": "展示所有规则"
    },
    {
      "action": "全部不勾选，确认",
      "expected": "展示所有规则"
    }
  ]
} as const;

test.describe("验证「内置规则」-「规则分类」筛选功能正确", () => {
  test("C0855 验证「内置规则」-「规则分类」筛选功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
