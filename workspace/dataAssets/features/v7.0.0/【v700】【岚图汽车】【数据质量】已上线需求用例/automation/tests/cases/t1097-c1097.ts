// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1097",
  "title": "验证【规则集管理 ❯】分页组件功能正常",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则集管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "分页组件UICHECK",
      "expected": "1) 共x条数据, 每页显示xx条2) 支持数字页码切换3) 支持前/后页箭头页码切换4) 支持10、20、50、100 页数切换"
    },
    {
      "action": "切换数字页码",
      "expected": "页码切换成功, 数据显示正常"
    },
    {
      "action": "切换前后页箭头页码",
      "expected": "页码切换成功, 数据显示正常"
    },
    {
      "action": "切换10、20、50、100页数",
      "expected": "页数切换成功, 数据显示正常"
    }
  ]
} as const;

test.describe("验证【规则集管理 ❯】分页组件功能正常", () => {
  test("C1097 验证【规则集管理 ❯】分页组件功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
