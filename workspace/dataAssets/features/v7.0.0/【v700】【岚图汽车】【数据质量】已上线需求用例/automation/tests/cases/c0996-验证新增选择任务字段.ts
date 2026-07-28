// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0996",
  "title": "验证新增选择任务字段",
  "steps": [
    {
      "action": "进入「数据质量-质量报告-新增报告」",
      "expected": "进入成功"
    },
    {
      "action": "「报告名称」填写「table1质量报告」，关联表选择${DATASOURCE}_${DATABASE}_table1，查看展示",
      "expected": "新增「选择任务」字段"
    },
    {
      "action": "查看「选择任务」下拉框",
      "expected": "展示「全部」「任务1」「任务2」"
    },
    {
      "action": "再添加一个关联表，查看「选择任务」下拉框",
      "expected": "只展示「全部」"
    }
  ]
} as const;

test.describe("验证新增选择任务字段", () => {
  test("C0996 验证新增选择任务字段", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
