// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0429",
  "title": "验证数据脱敏-脱敏白名单-新增功能正确",
  "steps": [
    {
      "action": "位置：「数据安全」-「数据脱敏管理」-「脱敏白名单」\n点击【新增】；\n选择数据源类型、数据源；\n选择一个数据库（具体数据库），一张数据表（具体数据表）；\n点击【确定】",
      "expected": "脱敏白名单列表页，新增一条数据，且数据正确"
    },
    {
      "action": "位置：「数据安全」-「数据脱敏管理」-「脱敏白名单」\n点击【新增】；\n选择数据源类型、数据源；\n选择一个数据库（具体数据库），2张数据表（具体数据表）；\n点击【确定】",
      "expected": "脱敏白名单列表页，新增2条数据（1张表1条数据），且数据正确"
    },
    {
      "action": "位置：「数据安全」-「数据脱敏管理」-「脱敏白名单」\n点击【新增】；\n选择数据源类型、数据源；\n选择全部数据库，全部数据表；\n点击【确定】",
      "expected": "脱敏白名单列表页，新增1条数据，且数据正确"
    }
  ]
} as const;

test.describe("验证数据脱敏-脱敏白名单-新增功能正确", () => {
  test("C0429 验证数据脱敏-脱敏白名单-新增功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
