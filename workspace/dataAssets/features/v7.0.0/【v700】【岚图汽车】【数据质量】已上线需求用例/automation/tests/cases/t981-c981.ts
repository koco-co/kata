// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C981",
  "title": "验证「数据质量」-「数据质量报告」-「报告状态」新增「持续生成中」选项",
  "steps": [
    {
      "action": "进入「数据质量」-【数据质量报告】-页面",
      "expected": "进入成功"
    },
    {
      "action": "点击「报告状态」筛选框",
      "expected": "展示「生成中、已生成、持续生成中」三个选项"
    }
  ]
} as const;

test.describe("验证「数据质量」-「数据质量报告」-「报告状态」新增「持续生成中」选项", () => {
  test("C981 验证「数据质量」-「数据质量报告」-「报告状态」新增「持续生成中」选项", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
