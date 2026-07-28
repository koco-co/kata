// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0889",
  "title": "验证【数据质量-规则库管理 自定义SQL模版】详情",
  "steps": [
    {
      "action": "点击列表自定义sql模版名称",
      "expected": "成功出现详情页面"
    },
    {
      "action": "查看详情字段及值",
      "expected": "详情内容正确，和新增、编辑保存成功的内容一致"
    }
  ]
} as const;

test.describe("验证【数据质量-规则库管理 自定义SQL模版】详情", () => {
  test("C0889 验证【数据质量-规则库管理 自定义SQL模版】详情", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
