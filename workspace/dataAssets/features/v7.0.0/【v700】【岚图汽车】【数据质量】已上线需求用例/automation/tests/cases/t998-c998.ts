// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C998",
  "title": "验证质量报告页面，根据表名搜索结果正确",
  "steps": [
    {
      "action": "进入「数据质量-质量报告」",
      "expected": "进入成功"
    },
    {
      "action": "数据表搜索\"table1\"，查看结果",
      "expected": "返回\"任务1\"\"任务2\"配置的两条单表报告以及当前表的自定义报告信息"
    }
  ]
} as const;

test.describe("验证质量报告页面，根据表名搜索结果正确", () => {
  test("C998 验证质量报告页面，根据表名搜索结果正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
