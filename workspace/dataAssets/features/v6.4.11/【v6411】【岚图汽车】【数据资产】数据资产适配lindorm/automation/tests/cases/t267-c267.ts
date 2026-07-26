// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C267",
  "title": "验证CSV表-创建功能",
  "steps": [
    {
      "action": "新建模型，存储格式选择“CSV”；",
      "expected": "操作成功"
    },
    {
      "action": "点击【生成建表语句】",
      "expected": "建表语句正确"
    },
    {
      "action": "确认建表",
      "expected": "建表成功"
    },
    {
      "action": "进入表详情页",
      "expected": "元数据信息展示正确"
    }
  ]
} as const;

test.describe("验证CSV表-创建功能", () => {
  test("C267 验证CSV表-创建功能", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
