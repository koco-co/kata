// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0875",
  "title": "验证【数据质量-规则库管理 自定义SQL模版 新增 基本信息】规则名称",
  "steps": [
    {
      "action": "提示词：请输入",
      "expected": "提示词正确"
    },
    {
      "action": "必填",
      "expected": "为空提示"
    },
    {
      "action": "最大支持输入100",
      "expected": "超长无法输入"
    },
    {
      "action": "不支持重复",
      "expected": "若重复，提示校验"
    }
  ]
} as const;

test.describe("验证【数据质量-规则库管理 自定义SQL模版 新增 基本信息】规则名称", () => {
  test("C0875 验证【数据质量-规则库管理 自定义SQL模版 新增 基本信息】规则名称", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
