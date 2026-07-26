// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C269",
  "title": "验证建表语句解析",
  "steps": [
    {
      "action": "主键表建表语句解析",
      "expected": "字段名、字段中文名、字段类型、字符长度、数值长度、字段精度、主键、分区字段、分区类型等解析成功"
    },
    {
      "action": "范围分区表语句解析",
      "expected": "1）字段名、字段中文名、字段类型、字符长度、数值长度、字段精度、主键、分区字段、分区类型等解析成功\n2）范围分区信息解析成功"
    },
    {
      "action": "各数据类型字段解析",
      "expected": "所有支持的字段类型均解析"
    }
  ]
} as const;

test.describe("验证建表语句解析", () => {
  test("C269 验证建表语句解析", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
