// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C468",
  "title": "验证手动分级-字段删除后分级数据显示正确",
  "steps": [
    {
      "action": "表中删除该字段后，同步该表数据到资产，查看分级数据显示",
      "expected": "该字段对应的分级数据标记为不存在"
    },
    {
      "action": "表中删除该表后，进行源库对比，查看分级数据显示",
      "expected": "不显示该表中所有字段的分级数据"
    },
    {
      "action": "删除该字段对应的库后，查看分级数据显示",
      "expected": "不显示该库中所有字段的分级数据"
    },
    {
      "action": "取消引入该数据源后，查看分级数据显示",
      "expected": "不显示该数据源中所有字段的分级数据"
    }
  ]
} as const;

test.describe("验证手动分级-字段删除后分级数据显示正确", () => {
  test("C468 验证手动分级-字段删除后分级数据显示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
