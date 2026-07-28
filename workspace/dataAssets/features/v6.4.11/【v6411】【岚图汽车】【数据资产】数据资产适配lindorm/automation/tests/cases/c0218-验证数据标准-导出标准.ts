// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0218",
  "title": "验证数据标准-导出标准",
  "steps": [
    {
      "action": "点击【导出标准】",
      "expected": "弹窗显示展开状态的所有标准目录"
    },
    {
      "action": "勾选目录，点击【确定】",
      "expected": "1）下载文件成功\n2）文件内容为所勾选目录下的数据标准，且数据正确"
    }
  ]
} as const;

test.describe("验证数据标准-导出标准", () => {
  test("C0218 验证数据标准-导出标准", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
