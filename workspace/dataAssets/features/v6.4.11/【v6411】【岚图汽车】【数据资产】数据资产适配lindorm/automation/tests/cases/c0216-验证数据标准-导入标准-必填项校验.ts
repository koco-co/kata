// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0216",
  "title": "验证数据标准-导入标准-必填项校验",
  "steps": [
    {
      "action": "导入文件中存在一条数据，中文名称、英文名称、英文缩写、标准目录，任一未空",
      "expected": "导入失败"
    }
  ]
} as const;

test.describe("验证数据标准-导入标准-必填项校验", () => {
  test("C0216 验证数据标准-导入标准-必填项校验", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
