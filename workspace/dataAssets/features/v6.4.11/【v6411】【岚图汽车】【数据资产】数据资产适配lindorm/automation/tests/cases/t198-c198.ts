// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C198",
  "title": "验证标准目录-查询",
  "steps": [
    {
      "action": "进入“标准定义”页面，查看“标准目录”",
      "expected": "以树形目录形式展示目录结构"
    },
    {
      "action": "逐层查看子目录",
      "expected": "子目录展示正确"
    },
    {
      "action": "展开/收缩目录",
      "expected": "展开/收缩功能正常"
    },
    {
      "action": "查看名称过长的目录",
      "expected": "目录过长部分省略号显示"
    },
    {
      "action": "hover名称过长的目录",
      "expected": "小气泡显示目录全称"
    }
  ]
} as const;

test.describe("验证标准目录-查询", () => {
  test("C198 验证标准目录-查询", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
