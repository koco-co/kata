// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0992",
  "title": "验证新增报告-多表-全部任务功能",
  "steps": [
    {
      "action": "进入「数据质量-质量报告-新增报告」",
      "expected": "进入成功"
    },
    {
      "action": "「报告名称」填写「table1质量报告」，关联表选择${DATASOURCE}_${DATABASE}_table1、table2",
      "expected": "新增「选择任务」字段"
    },
    {
      "action": "「选择任务」选择全部，点击确定",
      "expected": "保存成功"
    },
    {
      "action": "查看报告内容",
      "expected": "展示任务1、任务2、任务3相关的表级报告"
    }
  ]
} as const;

test.describe("验证新增报告-多表-全部任务功能", () => {
  test("C0992 验证新增报告-多表-全部任务功能", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
