// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0092",
  "title": "验证【标签信息】功能正常",
  "steps": [
    {
      "action": "点击任务详情【标签信息】按钮",
      "expected": "正确展示“标签名称”“标签英文名称”“标签ID”“所属实体”“标签描述”“创建人”“创建时间””最近修改人“最近修改时间”"
    }
  ]
} as const;

test.describe("验证【标签信息】功能正常", () => {
  test("C0092 验证【标签信息】功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
