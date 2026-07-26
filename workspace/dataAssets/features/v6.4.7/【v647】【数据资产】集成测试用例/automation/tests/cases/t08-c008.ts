// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C008",
  "title": "验证通用业务属性-新增枚举属性",
  "steps": [
    {
      "action": "进入【元数据】-【元模型管理】页面，点击【新增】；属性类型选择“枚举”，输入唯一属性名（如 `auto_enum_xxx`），点击【确定】",
      "expected": "弹窗关闭；页面主区域或业务属性列表中出现新建的枚举属性，名称与输入值一致"
    }
  ]
} as const;

test.describe("验证通用业务属性-新增枚举属性", () => {
  test("C008 验证通用业务属性-新增枚举属性", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
