// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C215",
  "title": "验证数据标准-导入标准-导入模版下载",
  "steps": [
    {
      "action": "1）点击【导入标准】；\n2）在弹窗中，点击【下载模版】",
      "expected": "下载文件成功；文件内容正确"
    }
  ]
} as const;

test.describe("验证数据标准-导入标准-导入模版下载", () => {
  test("C215 验证数据标准-导入标准-导入模版下载", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
