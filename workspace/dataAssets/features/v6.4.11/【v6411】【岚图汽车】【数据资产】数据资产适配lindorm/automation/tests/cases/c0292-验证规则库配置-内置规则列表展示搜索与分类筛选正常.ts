// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0292",
  "title": "验证【规则库配置-内置规则】列表展示、搜索与分类筛选正常",
  "steps": [
    {
      "action": "进入【数据质量 → 规则库配置】页面并停留在「内置规则」页签",
      "expected": "1)展示「规则库配置」「内置规则」「自定义正则」「自定义sql模版」\n2)列表列包含「规则名称」「规则解释」「规则分类」「关联范围」「关联规则数」「规则状态」「规则描述」"
    },
    {
      "action": "在「请输入规则名称进行搜索」输入规则关键字并切换规则分类筛选",
      "expected": "1)列表仅展示命中规则\n2)「规则分类」「关联范围」筛选后结果与查询条件一致"
    }
  ]
} as const;

test.describe("验证【规则库配置-内置规则】列表展示、搜索与分类筛选正常", () => {
  test("C0292 验证【规则库配置-内置规则】列表展示、搜索与分类筛选正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
