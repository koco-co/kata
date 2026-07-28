// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0997",
  "title": "验证新增质量报告，报告名称校验功能",
  "steps": [
    {
      "action": "进入「数据质量-质量报告-新增报告」",
      "expected": "进入成功"
    },
    {
      "action": "「报告名称」填写「table1质量报告」，关联表选择${DATASOURCE}_${DATABASE}_table1，任务选择全部，点击确定",
      "expected": "报错：已存在相同的报告名称"
    }
  ]
} as const;

test.describe("验证新增质量报告，报告名称校验功能", () => {
  test("C0997 验证新增质量报告，报告名称校验功能", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
