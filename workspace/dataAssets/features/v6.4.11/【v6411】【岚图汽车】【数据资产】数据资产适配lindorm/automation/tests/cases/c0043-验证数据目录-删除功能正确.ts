// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0043",
  "title": "验证【数据目录】-删除功能正确",
  "steps": [
    {
      "action": "1）一级目录NNN下无数据表\n2）二次确认删除",
      "expected": "删除成功"
    },
    {
      "action": "1）二级目录yyy下无数据表\n2）二次确认删除",
      "expected": "删除成功"
    },
    {
      "action": "1) 目录yyy下有数据表\n2) 二次确认删除",
      "expected": "提示“当前数据目录下存在数据表 无法删除”"
    }
  ]
} as const;

test.describe("验证【数据目录】-删除功能正确", () => {
  test("C0043 验证【数据目录】-删除功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
