// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C209",
  "title": "验证数据标准-必填校验",
  "steps": [
    {
      "action": "1）以下任一内容未完善：中文名称、英文名称、英文缩写、标准目录\n2）点击【保存】/【上线】",
      "expected": "对应项提示完善信息"
    }
  ]
} as const;

test.describe("验证数据标准-必填校验", () => {
  test("C209 验证数据标准-必填校验", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
