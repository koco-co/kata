// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C026",
  "title": "验证创建不同类型sparkThrift表功能正常",
  "steps": [
    {
      "action": "创建Hive PARQUET非事务内部表：\n\t- “表类型”选择“内部表”\n\t- “hdfs存储路径”为空",
      "expected": "生成的建表语句正确；\nPARQUET表创建成功；"
    },
    {
      "action": "创建Hive ORC非事务内部表：\n\t- “表类型”选择“内部表”\n\t- “hdfs存储路径”为空",
      "expected": "生成的建表语句正确；\nORC表创建成功；"
    },
    {
      "action": "创建Hive TEXTFILE非事务内部表：\n\t- “表类型”选择“内部表”\n\t- “hdfs存储路径”为指定路径（非默认路径）",
      "expected": "生成的建表语句正确；\nTEXTFILE表创建成功；"
    },
    {
      "action": "创建Hive外部表：\n\t- “表类型”选择“外部表”\n\t- “hdfs存储路径”为指定路径（非默认路径）",
      "expected": "生成的建表语句正确；\n事务表创建成功；\n该表存储路径正确"
    },
    {
      "action": "创建Hive分区表",
      "expected": "生成的建表语句正确；\n分区表创建成功；\n该表分区字段正确"
    }
  ]
} as const;

test.describe("验证创建不同类型sparkThrift表功能正常", () => {
  test("C026 验证创建不同类型sparkThrift表功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
