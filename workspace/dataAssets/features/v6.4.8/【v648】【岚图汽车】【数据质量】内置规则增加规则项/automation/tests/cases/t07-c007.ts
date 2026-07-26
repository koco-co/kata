// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C007",
  "title": "验证新增规则分类正确",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则库配置】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击规则分类筛选项",
      "expected": "规则分类新增“一致性校验“、“时效性校验“、“合理性校验“"
    }
  ]
} as const;

test.describe("验证新增规则分类正确", () => {
  test("C007 验证新增规则分类正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
