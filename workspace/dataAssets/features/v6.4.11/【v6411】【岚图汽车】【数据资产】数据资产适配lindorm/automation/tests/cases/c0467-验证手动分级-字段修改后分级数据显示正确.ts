// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0467",
  "title": "验证手动分级-字段修改后分级数据显示正确",
  "steps": [
    {
      "action": "表中修改字段名称后，同步该表到资产，查看分级数据显示",
      "expected": "该字段对应的数据分级标记为：(该字段已不存在)"
    }
  ]
} as const;

test.describe("验证手动分级-字段修改后分级数据显示正确", () => {
  test("C0467 验证手动分级-字段修改后分级数据显示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
