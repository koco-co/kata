// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0389",
  "title": "验证【「数据资产」-「数据质量」-「规则任务管理」】校验字段",
  "steps": [
    {
      "action": "引入的自定义sql模版约定了\"关联范围\"为\"字段级，多表\"",
      "expected": "支持选择校验字段，反之不支持选择？"
    },
    {
      "action": "单表",
      "expected": "不支持"
    },
    {
      "action": "校验字段",
      "expected": "支持多选，非必填支持为空"
    },
    {
      "action": "枚举内容",
      "expected": "表字段"
    },
    {
      "action": "选择校验字段后若存在不符合规则的明细数据",
      "expected": "选择的字段进行标红展示"
    }
  ]
} as const;

test.describe("验证【「数据资产」-「数据质量」-「规则任务管理」】校验字段", () => {
  test("C0389 验证【「数据资产」-「数据质量」-「规则任务管理」】校验字段", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
