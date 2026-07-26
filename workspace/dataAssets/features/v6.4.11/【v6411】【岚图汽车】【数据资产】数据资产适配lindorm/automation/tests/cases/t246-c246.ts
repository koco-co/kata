// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C246",
  "title": "验证词根管理-导入",
  "steps": [
    {
      "action": "点击导入词根",
      "expected": "弹窗导入词根弹窗"
    },
    {
      "action": "点击上传文件，点击确定",
      "expected": "1）提示文件上传成功！\n2）词根列表新增该词根"
    }
  ]
} as const;

test.describe("验证词根管理-导入", () => {
  test("C246 验证词根管理-导入", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
