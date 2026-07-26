// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C132",
  "title": "验证通用业务属性-新增功能-逻辑正常",
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
    },
    {
      "action": "进入${DATASOURCE_TYPE}数据源类型的数据表详情页，查看「业务属性」",
      "expected": "显示此新增的业务属性名"
    }
  ]
} as const;

test.describe("验证通用业务属性-新增功能-逻辑正常", () => {
  test("C132 验证通用业务属性-新增功能-逻辑正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
