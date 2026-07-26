// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C275",
  "title": "验证左侧模型元素的新增功能",
  "steps": [
    {
      "action": "点击“+”icon",
      "expected": "置顶新增编辑项"
    },
    {
      "action": "输入内容后，回车或者点击空白处",
      "expected": "新增模型元素被保存在左侧模型元素列表\n右侧元素值为空\n规范设计下拉框会新增该模型元素"
    },
    {
      "action": "鼠标hover/选中新增模型元素",
      "expected": "支持编辑、删除动操作"
    }
  ]
} as const;

test.describe("验证左侧模型元素的新增功能", () => {
  test("C275 验证左侧模型元素的新增功能", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
