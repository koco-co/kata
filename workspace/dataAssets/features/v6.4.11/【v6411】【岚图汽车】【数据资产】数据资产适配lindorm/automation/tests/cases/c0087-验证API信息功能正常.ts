// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0087",
  "title": "验证【API信息】功能正常",
  "steps": [
    {
      "action": "点击表详情【API信息】按钮",
      "expected": "正确展示“支持格式”“请求协议”“请求方式”“创建时间”“传输加密”“创建人”“API描述”"
    }
  ]
} as const;

test.describe("验证【API信息】功能正常", () => {
  test("C0087 验证【API信息】功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
