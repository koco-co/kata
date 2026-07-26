// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C434",
  "title": "验证数据脱敏-脱敏白名单-批量删除功能正确",
  "steps": [
    {
      "action": "表A和表B同时配置了脱敏规则以及脱敏白名单；\n勾选表A和表B的白名单记录；\n点击【批量删除】",
      "expected": "提示：请确认是否删除勾选的白名单信息"
    },
    {
      "action": "二次确认",
      "expected": "白名单列表，该记录被删除；\n表A和表B详情页数据预览，脱敏规则生效"
    }
  ]
} as const;

test.describe("验证数据脱敏-脱敏白名单-批量删除功能正确", () => {
  test("C434 验证数据脱敏-脱敏白名单-批量删除功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
