// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C021",
  "title": "验证词根管理-新建",
  "steps": [
    {
      "action": "点击新建词根",
      "expected": "弹出新建词根弹窗"
    },
    {
      "action": "填写内容，点击确定",
      "expected": "1）新增词根成功！\n2）词根列表新增该词根"
    }
  ]
} as const;

test.describe("验证词根管理-新建", () => {
  test("C021 验证词根管理-新建", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
