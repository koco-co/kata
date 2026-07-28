// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0264",
  "title": "验证创建不同类型SparkThrift表功能正常",
  "steps": [
    {
      "action": "创建SparkThrift内部表：\n\t- “表类型”选择“内部表”\n\t- “hdfs存储路径”为空",
      "expected": "生成的建表语句正确；\nHive内部表创建成功"
    }
  ]
} as const;

test.describe("验证创建不同类型SparkThrift表功能正常", () => {
  test("C0264 验证创建不同类型SparkThrift表功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
