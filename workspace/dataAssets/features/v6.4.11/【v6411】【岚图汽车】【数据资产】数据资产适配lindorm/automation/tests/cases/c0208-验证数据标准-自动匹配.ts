// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0208",
  "title": "验证数据标准-自动匹配",
  "steps": [
    {
      "action": "中文名称输入框填写“放贷金额数量”",
      "expected": "英文名称自动匹配：loan_amount_number\n英文缩写自动匹配：loan_amt_num"
    },
    {
      "action": "中文名称输入框填写“借款金钱”",
      "expected": "英文名称自动匹配：amount\n英文缩写自动匹配：amt"
    },
    {
      "action": "中文名称输入框填写“放贷”",
      "expected": "英文名称自动匹配：loan\n英文缩写自动匹配：loan"
    },
    {
      "action": "中文名称输入框填写词根管理中不存在的词根中文名",
      "expected": "英文名称和英文缩写为空"
    }
  ]
} as const;

test.describe("验证数据标准-自动匹配", () => {
  test("C0208 验证数据标准-自动匹配", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
