// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C292",
  "title": "验证「选择动态分区」-一二级分区字段不可重复选择",
  "steps": [
    {
      "action": "进入「数据质量」-「规则任务管理」-「监控对象」页面",
      "expected": "进入成功"
    },
    {
      "action": "选择「选择动态分区」，一级分区选择「dt」，一级分区值选择「参数1」",
      "expected": "选择成功"
    },
    {
      "action": "点击二级分区字段选择下拉框",
      "expected": "不可选择「dt」字段"
    },
    {
      "action": "选择「hour」字段",
      "expected": "可正常选择"
    }
  ]
} as const;

test.describe("验证「选择动态分区」-一二级分区字段不可重复选择", () => {
  test("C292 验证「选择动态分区」-一二级分区字段不可重复选择", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
