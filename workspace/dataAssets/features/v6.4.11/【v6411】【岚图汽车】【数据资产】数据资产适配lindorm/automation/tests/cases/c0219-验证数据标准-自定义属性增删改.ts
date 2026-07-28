// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0219",
  "title": "验证数据标准-自定义属性增删改",
  "steps": [
    {
      "action": "点击添加属性",
      "expected": "自定义属性下出现一行为空的属性项和属性值"
    },
    {
      "action": "输入属性项和属性值，点击✅icon",
      "expected": "1）该自定义属性被保存\n2）属性项置灰不可更改，属性值可更改"
    },
    {
      "action": "点击属性值输入框，更改属性值，之后点击空白处",
      "expected": "属性值内容更改"
    },
    {
      "action": "点击该自定义属性右侧的删除icon",
      "expected": "二次弹窗确认"
    },
    {
      "action": "点击确定",
      "expected": "该自定义属性删除"
    }
  ]
} as const;

test.describe("验证数据标准-自定义属性增删改", () => {
  test("C0219 验证数据标准-自定义属性增删改", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
