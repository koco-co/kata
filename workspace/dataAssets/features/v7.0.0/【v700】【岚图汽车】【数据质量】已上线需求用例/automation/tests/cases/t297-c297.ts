// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C297",
  "title": "验证「选择动态分区」-表元数据已同步-成功-分区字段过滤功能正确",
  "steps": [
    {
      "action": "进入「数据质量」-「规则任务管理」-「监控对象」页面",
      "expected": "进入成功"
    },
    {
      "action": "选择「选择动态分区」，点击「请选择一级分区字段」下拉框",
      "expected": "仅仅展示分区字段「dt\\\\pt」"
    }
  ]
} as const;

test.describe("验证「选择动态分区」-表元数据已同步-成功-分区字段过滤功能正确", () => {
  test("C297 验证「选择动态分区」-表元数据已同步-成功-分区字段过滤功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
