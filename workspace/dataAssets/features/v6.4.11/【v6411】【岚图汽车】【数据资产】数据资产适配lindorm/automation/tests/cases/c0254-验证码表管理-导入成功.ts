// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0254",
  "title": "验证码表管理-导入成功",
  "steps": [
    {
      "action": "点击导入代码",
      "expected": "弹窗导入代码弹窗"
    },
    {
      "action": "点击上传文件，点击确定",
      "expected": "1）提示文件上传成功！\n2）代码列表新增该代码"
    }
  ]
} as const;

test.describe("验证码表管理-导入成功", () => {
  test("C0254 验证码表管理-导入成功", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
