// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C010",
  "title": "验证通用业务属性-新增bigint类型文本框属性",
  "steps": [
    {
      "action": "进入【元数据】-【元模型管理】页面，点击【新增】；属性类型选择“文本框”，字段类型选择“bigint”，输入唯一属性名（如 `auto_bigint_xxx`），点击【确定】",
      "expected": "弹窗关闭；列表中出现新建的 bigint 文本框属性，名称与字段类型显示正确"
    }
  ]
} as const;

test.describe("验证通用业务属性-新增bigint类型文本框属性", () => {
  test("C010 验证通用业务属性-新增bigint类型文本框属性", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
