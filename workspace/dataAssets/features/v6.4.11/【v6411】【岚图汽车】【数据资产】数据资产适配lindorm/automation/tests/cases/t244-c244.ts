// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C244",
  "title": "验证词根管理-查询",
  "steps": [
    {
      "action": "输入存在的词根简称/词根全称",
      "expected": "列表展示符合要求的词根"
    },
    {
      "action": "输入不存在的词根简称/词根全称",
      "expected": "列表显示为空"
    }
  ]
} as const;

test.describe("验证词根管理-查询", () => {
  test("C244 验证词根管理-查询", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
