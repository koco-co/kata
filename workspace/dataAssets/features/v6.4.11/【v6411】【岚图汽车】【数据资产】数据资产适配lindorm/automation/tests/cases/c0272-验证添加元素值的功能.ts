// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0272",
  "title": "验证添加元素值的功能",
  "steps": [
    {
      "action": "点击「添加元素值」",
      "expected": "置顶新增一级编辑项\n存在两个输入框：中文名输入框（请输入中文名称）、英文名称输入框（请输入英文缩写，用于表名约束）"
    },
    {
      "action": "输入中文名和英文名称，点击空白处",
      "expected": "元素值新增成功"
    }
  ]
} as const;

test.describe("验证添加元素值的功能", () => {
  test("C0272 验证添加元素值的功能", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
