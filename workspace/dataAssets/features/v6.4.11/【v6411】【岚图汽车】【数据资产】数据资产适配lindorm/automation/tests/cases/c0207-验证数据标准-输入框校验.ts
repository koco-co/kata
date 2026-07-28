// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0207",
  "title": "验证数据标准-输入框校验",
  "steps": [
    {
      "action": "输入中文名称包含除了中文、英文字母、数字、下划线（_）、and（&）、英文括号以外的字符",
      "expected": "提示“请按格式要求输入”"
    },
    {
      "action": "输入英文名称包含除了英文字母、数字、下划线（_）、and（&）、英文括号以外的字符",
      "expected": "提示“请按格式要求输入”"
    },
    {
      "action": "输入英文缩写包含除了小写英文字母、数字、下划线（_）、and（&）、英文括号以外的字符",
      "expected": "提示“请按格式要求输入”"
    },
    {
      "action": "输入标准编号包含除了英文字母、数字、下划线（_）、and（&）、英文括号以外的字符",
      "expected": "提示“请按格式要求输入”"
    },
    {
      "action": "在中文名称输入框中输入256个字符",
      "expected": "第256个字符不能输入"
    },
    {
      "action": "在英文名称输入框中输入256个字符",
      "expected": "第256个字符不能输入"
    },
    {
      "action": "在英文缩写输入框中输入256个字符",
      "expected": "第256个字符不能输入"
    },
    {
      "action": "在标准编号输入框中输入256个字符",
      "expected": "第256个字符不能输入"
    },
    {
      "action": "在标准来源输入框中输入256个字符",
      "expected": "第256个字符不能输入"
    }
  ]
} as const;

test.describe("验证数据标准-输入框校验", () => {
  test("C0207 验证数据标准-输入框校验", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
