// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C241",
  "title": "验证引用标准功能",
  "steps": [
    {
      "action": "1.选择模板下拉框选择数据标准\n2.点击引用标准\n3.选择同级目录引入",
      "expected": "标准定义那里成功引入同级标准"
    },
    {
      "action": "1.选择模板下拉框选择数据标准\n2.点击引用标准\n3.选择同级目录引入",
      "expected": "标准定义那里成功引入同级标准"
    }
  ]
} as const;

test.describe("验证引用标准功能", () => {
  test("C241 验证引用标准功能", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
