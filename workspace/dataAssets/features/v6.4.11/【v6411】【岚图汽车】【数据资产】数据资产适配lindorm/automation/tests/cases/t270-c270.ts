// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C270",
  "title": "验证数据建模，中文名/字段名输入匹配词根/标准正确",
  "steps": [
    {
      "action": "数据建模时，中文名输入框输入“支付”",
      "expected": "自动展示词根或数据标准中包含“支付”的数据"
    },
    {
      "action": "选择匹配的词根“支付”",
      "expected": "词根的中文名、词根简称，能够回填至中文名和字段名"
    },
    {
      "action": "选择匹配的词根“支付方式”",
      "expected": "标准的中文名、英文缩写，能够回填至中文名和字段名"
    }
  ]
} as const;

test.describe("验证数据建模，中文名/字段名输入匹配词根/标准正确", () => {
  test("C270 验证数据建模，中文名/字段名输入匹配词根/标准正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
