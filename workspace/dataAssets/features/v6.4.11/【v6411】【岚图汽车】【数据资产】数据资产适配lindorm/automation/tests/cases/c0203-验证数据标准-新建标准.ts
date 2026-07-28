// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0203",
  "title": "验证数据标准-新建标准",
  "steps": [
    {
      "action": "1）点击新建标准\n2）输入合格的所有业务属性值和所有技术属性值，点击【保存】\\",
      "expected": "【上线】"
    },
    {
      "action": "1）点击新建标准\n2）输入合格的所有业务属性值和所有技术属性值，点击【取消】",
      "expected": "页面跳转至数据标准列表页"
    }
  ]
} as const;

test.describe("验证数据标准-新建标准", () => {
  test("C0203 验证数据标准-新建标准", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
