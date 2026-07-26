// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C439",
  "title": "验证数据脱敏-规则优先级-优先级应用功能正确",
  "steps": [
    {
      "action": "准备两个脱敏规则：\n\t规则1:\n\t\t脱敏方式：遮盖脱敏\n\t\t覆盖方式：全部覆盖\n\t\t脱敏应用-脱敏表：tableA\n\t\t脱敏应用-识别规则：字段名称=colA\n\t\t脱敏应用-规则优先级：2\n\t规则2:\n\t\t脱敏方式：遮盖脱敏\n\t\t覆盖方式：部分覆盖\n\t\t脱敏应用-脱敏表：tableA\n\t\t脱敏应用-识别规则：字段名称=colA\n\t\t脱敏应用-规则优先级：1\n\n查看tableA详情页的数据预览",
      "expected": "tableA的colA字段，采取规则2的脱敏规则"
    },
    {
      "action": "准备两个脱敏规则：\n\t规则1:\n\t\t脱敏方式：遮盖脱敏\n\t\t覆盖方式：全部覆盖\n\t\t脱敏应用-脱敏表：tableA\n\t\t脱敏应用-识别规则：字段名称=colA\n\t\t脱敏应用-规则优先级：1\n\t规则2:\n\t\t脱敏方式：遮盖脱敏\n\t\t覆盖方式：部分覆盖\n\t\t脱敏应用-脱敏表：tableA\n\t\t脱敏应用-识别规则：字段名称=colA\n\t\t脱敏应用-规则优先级：1\n\n查看tableA详情页的数据预览",
      "expected": "tableA的colA字段，采取规则2的脱敏规则"
    }
  ]
} as const;

test.describe("验证数据脱敏-规则优先级-优先级应用功能正确", () => {
  test("C439 验证数据脱敏-规则优先级-优先级应用功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
