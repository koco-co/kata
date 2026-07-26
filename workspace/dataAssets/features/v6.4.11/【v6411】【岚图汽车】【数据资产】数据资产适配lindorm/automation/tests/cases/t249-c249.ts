// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C249",
  "title": "验证码表管理-代码目录-编辑",
  "steps": [
    {
      "action": "对代码目录A进行编辑，编辑为B",
      "expected": "1）代码目录编辑成功\n2）该代码目录下的代码详情中的代码目录显示为编辑后的目录名称"
    }
  ]
} as const;

test.describe("验证码表管理-代码目录-编辑", () => {
  test("C249 验证码表管理-代码目录-编辑", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
