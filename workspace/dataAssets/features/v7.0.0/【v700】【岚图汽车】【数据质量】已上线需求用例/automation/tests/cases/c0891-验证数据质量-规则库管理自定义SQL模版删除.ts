// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0891",
  "title": "验证【数据质量-规则库管理 自定义SQL模版】删除",
  "steps": [
    {
      "action": "未被自定义sql引用的模版，点击删除按钮，二次确认是否可以删除，点击确定",
      "expected": "删除成功"
    },
    {
      "action": "已被被自定义sql引用的模版，点击删除按钮，二次确认是否可以删除，点击确定",
      "expected": "删除失败，提示校验？"
    }
  ]
} as const;

test.describe("验证【数据质量-规则库管理 自定义SQL模版】删除", () => {
  test("C0891 验证【数据质量-规则库管理 自定义SQL模版】删除", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
