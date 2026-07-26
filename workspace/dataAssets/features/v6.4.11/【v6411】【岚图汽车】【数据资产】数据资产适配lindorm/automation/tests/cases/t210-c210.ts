// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C210",
  "title": "验证数据标准-重复性校验",
  "steps": [
    {
      "action": "中文名称输入“国家”",
      "expected": "失焦后提示“与已有标准\"国家\"冲突”"
    },
    {
      "action": "英文名称输入“Country”",
      "expected": "失焦后提示“与已有标准\"Country\"冲突”"
    },
    {
      "action": "英文缩写输入“cntr”",
      "expected": "失焦后提示“与已有标准\"cntr\"冲突”"
    }
  ]
} as const;

test.describe("验证数据标准-重复性校验", () => {
  test("C210 验证数据标准-重复性校验", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
