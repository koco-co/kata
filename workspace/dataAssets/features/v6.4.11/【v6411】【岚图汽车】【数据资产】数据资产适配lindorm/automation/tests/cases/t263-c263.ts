// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C263",
  "title": "验证创建表，表类型/hdfs存储路径配置交互正确",
  "steps": [
    {
      "action": "进入建表页面；\n选择Hive/Sparkthrift数据源；",
      "expected": "“存储格式”下方显示“表类型”选项以及“hdfs存储路径”输入框；\n“表类型”默认选中“内部表”；"
    },
    {
      "action": "“表类型”选择“外部表”",
      "expected": "“hdfs存储路径”为必填项"
    },
    {
      "action": "“表类型”选择“内部表”",
      "expected": "“hdfs存储路径”为非必填项"
    }
  ]
} as const;

test.describe("验证创建表，表类型/hdfs存储路径配置交互正确", () => {
  test("C263 验证创建表，表类型/hdfs存储路径配置交互正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
