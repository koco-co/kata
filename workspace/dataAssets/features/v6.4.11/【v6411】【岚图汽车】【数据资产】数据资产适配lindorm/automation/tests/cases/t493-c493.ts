// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C493",
  "title": "验证数据源列表-状态筛选功能正常",
  "steps": [
    {
      "action": "筛选“正常”",
      "expected": "返回连接正常的数据源"
    },
    {
      "action": "筛选“连接失败”",
      "expected": "返回连接连接的数据源"
    },
    {
      "action": "重置",
      "expected": "返回所有数据源"
    }
  ]
} as const;

test.describe("验证数据源列表-状态筛选功能正常", () => {
  test("C493 验证数据源列表-状态筛选功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
