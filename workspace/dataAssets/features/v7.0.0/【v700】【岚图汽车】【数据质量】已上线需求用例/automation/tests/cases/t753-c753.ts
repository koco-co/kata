// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C753",
  "title": "验证编辑自定义正则正常",
  "steps": [
    {
      "action": "选择一个规则，点击规则后操作列编辑按钮",
      "expected": "弹出编辑规则弹窗\n包含输入框规则名称、规则模式、规则类型、关联范围、规则描述、正则"
    },
    {
      "action": "输入框修改为不同的内容点击确定",
      "expected": "修改规则成功，列表规则显示为修改后内容"
    }
  ]
} as const;

test.describe("验证编辑自定义正则正常", () => {
  test("C753 验证编辑自定义正则正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
