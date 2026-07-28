// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0295",
  "title": "验证「选择动态分区」-表元数据未同步-字段展示正确",
  "steps": [
    {
      "action": "进入「数据质量」-「规则任务管理」-「监控对象」页面",
      "expected": "进入成功"
    },
    {
      "action": "选择「选择动态分区」，点击「请选择一级分区字段」下拉框",
      "expected": "展示表A分区字段，如果没有分区，则展示所有字段(直连底层库查询)"
    }
  ]
} as const;

test.describe("验证「选择动态分区」-表元数据未同步-字段展示正确", () => {
  test("C0295 验证「选择动态分区」-表元数据未同步-字段展示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
