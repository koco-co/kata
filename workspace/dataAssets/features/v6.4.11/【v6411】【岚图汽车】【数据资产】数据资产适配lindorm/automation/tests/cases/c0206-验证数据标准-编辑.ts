// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0206",
  "title": "验证数据标准-编辑",
  "steps": [
    {
      "action": "1）点击数据标准A的【编辑】按钮\n2）对数据标准A所有可编辑属性进行修改\n3）点击【保存】",
      "expected": "保存成功，且各属性修改正确"
    }
  ]
} as const;

test.describe("验证数据标准-编辑", () => {
  test("C0206 验证数据标准-编辑", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
