// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C868",
  "title": "验证【数据质量-规则库管理 自定义正则】文案调整",
  "steps": [
    {
      "action": "查看原先的\"自定义正则\"tab名称",
      "expected": "已成功修改为\"自定义正则\""
    },
    {
      "action": "查看原先\"新增自定义正则\"按钮名称",
      "expected": "已成功修改为\"新增自定义正则\""
    }
  ]
} as const;

test.describe("验证【数据质量-规则库管理 自定义正则】文案调整", () => {
  test("C868 验证【数据质量-规则库管理 自定义正则】文案调整", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
