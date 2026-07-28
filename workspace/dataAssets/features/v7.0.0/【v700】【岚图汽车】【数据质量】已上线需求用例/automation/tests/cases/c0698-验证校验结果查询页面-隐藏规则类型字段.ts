// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0698",
  "title": "验证「校验结果查询」页面-隐藏「规则类型」字段",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【校验结果查询】页面",
      "expected": "进入成功"
    },
    {
      "action": "UI CHECK",
      "expected": "隐藏「规则类型」字段"
    }
  ]
} as const;

test.describe("验证「校验结果查询」页面-隐藏「规则类型」字段", () => {
  test("C0698 验证「校验结果查询」页面-隐藏「规则类型」字段", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
