// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C253",
  "title": "验证码表管理-编辑",
  "steps": [
    {
      "action": "点击编辑",
      "expected": "弹出编辑代码弹窗"
    },
    {
      "action": "编辑内容，点击确定",
      "expected": "1）提示编辑代码成功！\n2）该代码显示为编辑后的内容"
    },
    {
      "action": "查看数据标准A的枚举范围配置",
      "expected": "枚举范围的码表内容更新"
    }
  ]
} as const;

test.describe("验证码表管理-编辑", () => {
  test("C253 验证码表管理-编辑", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
