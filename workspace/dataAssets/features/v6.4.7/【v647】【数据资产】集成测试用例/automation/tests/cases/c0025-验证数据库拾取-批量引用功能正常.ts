// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0025",
  "title": "验证数据库拾取-批量引用功能正常",
  "steps": [
    {
      "action": "位置：数据标准-标准基础-数据库拾取；\n选择‘词根管理’类型，点击【查看拾取】；\n点击【批量引用】，二次确认",
      "expected": "当前页面所选词根变为“已引用”状态；\n勾选的词根均可在‘词根管理’菜单中查询到；"
    },
    {
      "action": "位置：数据标准-标准基础-数据库拾取；\n选择‘数据标准’类型，点击【查看拾取】；\n点击【批量引用】，二次确认",
      "expected": "当前页面所选标准变为“已引用”状态；\n勾选的标准均可在‘数据标准’菜单中查询到；"
    }
  ]
} as const;

test.describe("验证数据库拾取-批量引用功能正常", () => {
  test("C0025 验证数据库拾取-批量引用功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
