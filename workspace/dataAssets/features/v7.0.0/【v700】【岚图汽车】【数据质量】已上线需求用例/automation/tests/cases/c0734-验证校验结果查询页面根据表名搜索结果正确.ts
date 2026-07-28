// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0734",
  "title": "验证校验结果查询页面，根据表名搜索结果正确",
  "steps": [
    {
      "action": "进入「【数据资产】-【数据质量】-【校验结果查询】」",
      "expected": "进入成功"
    },
    {
      "action": "搜索\"table1\"，查看结果",
      "expected": "返回\"任务1\"、\"任务2\"两条规则的实例"
    }
  ]
} as const;

test.describe("验证校验结果查询页面，根据表名搜索结果正确", () => {
  test("C0734 验证校验结果查询页面，根据表名搜索结果正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
