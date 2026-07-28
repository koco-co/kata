// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0299",
  "title": "验证「选择动态分区」后查看「全局参数」功能正确",
  "steps": [
    {
      "action": "进入「数据质量」-「规则任务管理」-「监控对象」页面",
      "expected": "进入成功"
    },
    {
      "action": "选择「选择动态分区」，点击「全局参数」",
      "expected": "展示所有全局参数(包含新增和编辑的)"
    },
    {
      "action": "点击复制参数名称按钮",
      "expected": "参数名称复制成功"
    }
  ]
} as const;

test.describe("验证「选择动态分区」后查看「全局参数」功能正确", () => {
  test("C0299 验证「选择动态分区」后查看「全局参数」功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
