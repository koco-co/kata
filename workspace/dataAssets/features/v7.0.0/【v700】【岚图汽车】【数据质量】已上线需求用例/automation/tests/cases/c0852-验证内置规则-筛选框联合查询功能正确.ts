// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0852",
  "title": "验证「内置规则」-筛选框联合查询功能正确",
  "steps": [
    {
      "action": "进入「资产」-「数据质量」-「规则任务管理」-「规则库配置」页面",
      "expected": "进入成功"
    },
    {
      "action": "「规则分类」选择「完整性」「有效性」",
      "expected": "选择成功"
    },
    {
      "action": "「关联范围」选择「表级」「字段级」",
      "expected": "选择成功"
    },
    {
      "action": "「规则状态」选择「开启」",
      "expected": "选择成功"
    },
    {
      "action": "联合查询",
      "expected": "成功筛选出所有状态为开启的「完整性」+「有效性」的「表级」和「字段级」的规则"
    }
  ]
} as const;

test.describe("验证「内置规则」-筛选框联合查询功能正确", () => {
  test("C0852 验证「内置规则」-筛选框联合查询功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
