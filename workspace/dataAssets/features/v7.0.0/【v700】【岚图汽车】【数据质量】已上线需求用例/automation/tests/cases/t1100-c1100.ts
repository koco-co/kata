// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1100",
  "title": "验证【规则集管理 ❯】规则集管理查询功能",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则集管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "检查查询框",
      "expected": "1、提示: 输入表名搜索2、支持回车查询、搜索icon查询"
    },
    {
      "action": "输入表部分名查询",
      "expected": "模糊查询成功"
    },
    {
      "action": "输入表全名查询",
      "expected": "查询成功"
    }
  ]
} as const;

test.describe("验证【规则集管理 ❯】规则集管理查询功能", () => {
  test("C1100 验证【规则集管理 ❯】规则集管理查询功能", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
