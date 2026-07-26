// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C872",
  "title": "验证【数据质量-规则库管理 自定义SQL模版】列表展示",
  "steps": [
    {
      "action": "列表展示规则名称、规则分类、关联范围、关联规则数、规则描述、操作",
      "expected": "列表字段显示正确"
    },
    {
      "action": "支持规则分类筛选，点击漏斗，枚举内容支持多选",
      "expected": "筛选结果正确"
    },
    {
      "action": "支持规则范围筛选，点击漏斗，枚举内容支持多选",
      "expected": "筛选结果正确"
    },
    {
      "action": "查看关联规则数",
      "expected": "数量正确"
    }
  ]
} as const;

test.describe("验证【数据质量-规则库管理 自定义SQL模版】列表展示", () => {
  test("C872 验证【数据质量-规则库管理 自定义SQL模版】列表展示", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
