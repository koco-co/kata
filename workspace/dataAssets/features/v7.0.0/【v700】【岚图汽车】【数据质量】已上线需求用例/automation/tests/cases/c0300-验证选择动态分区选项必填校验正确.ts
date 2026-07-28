// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0300",
  "title": "验证「选择动态分区」选项必填校验正确",
  "steps": [
    {
      "action": "进入「数据质量」-「规则任务管理」-「监控对象」页面",
      "expected": "进入成功"
    },
    {
      "action": "选择「选择动态分区」，不选择「一级分区字段」「一级分区字段值」，点击「下一步」",
      "expected": "提示必填项未填"
    }
  ]
} as const;

test.describe("验证「选择动态分区」选项必填校验正确", () => {
  test("C0300 验证「选择动态分区」选项必填校验正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
