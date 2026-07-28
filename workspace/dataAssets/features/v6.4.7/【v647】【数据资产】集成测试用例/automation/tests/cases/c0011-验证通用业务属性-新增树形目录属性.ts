// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0011",
  "title": "验证通用业务属性-新增树形目录属性",
  "steps": [
    {
      "action": "进入【元数据】-【元模型管理】页面，点击【新增】；属性类型选择“树形目录”，输入唯一属性名（如 `auto_tree_xxx`），点击【确定】",
      "expected": "弹窗关闭；列表中出现新建的树形目录属性，名称正确"
    }
  ]
} as const;

test.describe("验证通用业务属性-新增树形目录属性", () => {
  test("C0011 验证通用业务属性-新增树形目录属性", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
