// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C487",
  "title": "验证数据源引入功能正常",
  "steps": [
    {
      "action": "点击【引入数据源】",
      "expected": "待引入窗口，数据源包含未引入的数据源"
    },
    {
      "action": "查看“数据源类型”下拉框",
      "expected": "包含所有资产支持的数据源类型"
    },
    {
      "action": "选择数据源引入",
      "expected": "引入成功"
    }
  ]
} as const;

test.describe("验证数据源引入功能正常", () => {
  test("C487 验证数据源引入功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
