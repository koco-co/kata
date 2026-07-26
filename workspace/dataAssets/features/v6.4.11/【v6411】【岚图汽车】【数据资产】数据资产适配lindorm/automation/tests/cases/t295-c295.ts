// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C295",
  "title": "验证【规则库配置-内置规则】新增规则分类与新增内置规则展示正确",
  "steps": [
    {
      "action": "进入【数据质量 → 规则库配置】页面并停留在「内置规则」页签",
      "expected": "1)展示「规则库配置」「内置规则」「自定义正则」「自定义sql模版」\n2)列表列包含「规则名称」「规则解释」「规则分类」「关联范围」「关联规则数」「规则状态」「规则描述」"
    },
    {
      "action": "筛选「合理性校验」「时效性校验」等新增规则分类并查看新增内置规则",
      "expected": "1)列表可展示「多表字段值对比」「字段值计算对比」「周期性校验」「及时性校验」「数据变化趋势」等新增规则\n2)重复内置规则不重复展示"
    }
  ]
} as const;

test.describe("验证【规则库配置-内置规则】新增规则分类与新增内置规则展示正确", () => {
  test("C295 验证【规则库配置-内置规则】新增规则分类与新增内置规则展示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
