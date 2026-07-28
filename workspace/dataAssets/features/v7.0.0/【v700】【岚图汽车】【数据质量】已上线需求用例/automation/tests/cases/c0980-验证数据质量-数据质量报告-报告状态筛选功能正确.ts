// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0980",
  "title": "验证「数据质量」-「数据质量报告」-「报告状态」筛选功能正确",
  "steps": [
    {
      "action": "进入「数据质量」-【数据质量报告】-页面",
      "expected": "进入成功"
    },
    {
      "action": "点击「报告状态」筛选框",
      "expected": "展示「生成中、已生成、持续生成中」三个选项"
    },
    {
      "action": "勾选「生成中」状态",
      "expected": "仅展示「生成中」状态的报告"
    },
    {
      "action": "勾选「已生成」状态",
      "expected": "仅展示「已生成」状态的报告"
    },
    {
      "action": "勾选「持续生成中」状态",
      "expected": "仅展示「持续生成中」状态的报告"
    },
    {
      "action": "勾选「生成中」「已生成」状态",
      "expected": "展示「生成中」「已生成」状态的报告"
    },
    {
      "action": "全部勾选",
      "expected": "展示所有状态的报告"
    }
  ]
} as const;

test.describe("验证「数据质量」-「数据质量报告」-「报告状态」筛选功能正确", () => {
  test("C0980 验证「数据质量」-「数据质量报告」-「报告状态」筛选功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
