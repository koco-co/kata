// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0006",
  "title": "验证【时效性校验】筛选功能正常",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则库配置】页面",
      "expected": "进入成功"
    },
    {
      "action": "规则分类分类筛选: 时效性校验",
      "expected": "筛选成功, 结果正确"
    },
    {
      "action": "规则分类分类筛选: 时效性校验 + 唯一性校验",
      "expected": "组合筛选成功, 结果正确"
    },
    {
      "action": "重置后, 确定",
      "expected": "筛选成功, 结果正确"
    }
  ]
} as const;

test.describe("验证【时效性校验】筛选功能正常", () => {
  test("C0006 验证【时效性校验】筛选功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
