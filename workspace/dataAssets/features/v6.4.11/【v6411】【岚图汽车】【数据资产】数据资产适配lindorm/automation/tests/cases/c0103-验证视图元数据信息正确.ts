// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0103",
  "title": "验证视图元数据信息正确",
  "steps": [
    {
      "action": "查看“表结构”-“字段”",
      "expected": "字段列表数据正确"
    },
    {
      "action": "查看“表结构”-“建表语句”",
      "expected": "建表语句正确且格式化展示"
    },
    {
      "action": "查看“数据预览”",
      "expected": "数据预览结果正确"
    }
  ]
} as const;

test.describe("验证视图元数据信息正确", () => {
  test("C0103 验证视图元数据信息正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
