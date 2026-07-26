// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C262",
  "title": "验证数据库拾取-引用至标准校验",
  "steps": [
    {
      "action": "查看“标准中文名”为空或者为空字符串的数据",
      "expected": "该条数据无“引用至标准”按钮"
    },
    {
      "action": "查看“标准中文名”有效的记录",
      "expected": "该条数据有“引用至标准”按钮"
    },
    {
      "action": "点击【引用至标准】",
      "expected": "引用成功；\n该条记录状态更新为“已引用”；\n数据标准菜单中可以找到对应的数据标准"
    },
    {
      "action": "点击【全选】",
      "expected": "“标准中文名”为空/空字符串的数据无法勾选"
    }
  ]
} as const;

test.describe("验证数据库拾取-引用至标准校验", () => {
  test("C262 验证数据库拾取-引用至标准校验", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
