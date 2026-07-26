// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C274",
  "title": "验证左侧模型元素支持重命名的操作",
  "steps": [
    {
      "action": "点击业务系统/主题域/新增模型元素的重命名icon",
      "expected": "模型元素为可编辑状态"
    },
    {
      "action": "编辑模型元素，回车或者点击空白处",
      "expected": "模型元素编辑成功\n规范设计的下拉框中模型元素为编辑后的内容"
    }
  ]
} as const;

test.describe("验证左侧模型元素支持重命名的操作", () => {
  test("C274 验证左侧模型元素支持重命名的操作", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
