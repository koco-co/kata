// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C110",
  "title": "验证物化视图删除功能正确",
  "steps": [
    {
      "action": "删除方式：删除元数据视图",
      "expected": "1）数据地图中所选物化视图已被删除；\n2）底层所选物化视图仍然存在"
    },
    {
      "action": "删除方式：删除源视图",
      "expected": "1）数据地图中所选物化视图已被删除；\n2）底层所选物化视图也被删除"
    }
  ]
} as const;

test.describe("验证物化视图删除功能正确", () => {
  test("C110 验证物化视图删除功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
