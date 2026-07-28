// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0148",
  "title": "验证个性业务属性-新增功能逻辑正常",
  "steps": [
    {
      "action": "新增枚举属性：\n1）属性类型为“枚举”\n2）输入表单内容\n3）点击【确定】",
      "expected": "列表中显示新建的业务属性，且数据正确"
    },
    {
      "action": "新增string类型文本框属性：\n1）属性类型为“文本框”，字段类型为“string”\n2）输入表单内容\n3）点击【确定】",
      "expected": "列表中显示新建的业务属性，且数据正确"
    },
    {
      "action": "新增bigint类型文本框属性：\n1）属性类型为“文本框”，字段类型为“bigint”\n2）输入表单内容\n3）点击【确定】",
      "expected": "列表中显示新建的业务属性，且数据正确"
    },
    {
      "action": "新增树形目录属性：\n1）属性类型为“树形目录”\n2）输入表单内容\n3）点击【确定】",
      "expected": "列表中显示新建的业务属性，且数据正确"
    }
  ]
} as const;

test.describe("验证个性业务属性-新增功能逻辑正常", () => {
  test("C0148 验证个性业务属性-新增功能逻辑正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
