// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0097",
  "title": "验证【指标信息】功能正常",
  "steps": [
    {
      "action": "点击任务详情【指标信息】按钮",
      "expected": "正确展示“指标名称”“指标ID”“指标频度”“指标别名”“负责人”“更新人”“更新时间”“业务口径”“指标描述”"
    }
  ]
} as const;

test.describe("验证【指标信息】功能正常", () => {
  test("C0097 验证【指标信息】功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
