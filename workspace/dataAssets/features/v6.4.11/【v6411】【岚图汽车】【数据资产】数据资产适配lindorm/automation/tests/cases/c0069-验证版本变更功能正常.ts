// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0069",
  "title": "验证【版本变更】功能正常",
  "steps": [
    {
      "action": "点击表详情【版本变更】按钮",
      "expected": "展示【版本号】【操作人】【操作时间】"
    },
    {
      "action": "空白页展示",
      "expected": "展示“暂无数据”"
    },
    {
      "action": "选择多个版本，点击版本对比按钮",
      "expected": "多个版本变更内容标注正确"
    }
  ]
} as const;

test.describe("验证【版本变更】功能正常", () => {
  test("C0069 验证【版本变更】功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
