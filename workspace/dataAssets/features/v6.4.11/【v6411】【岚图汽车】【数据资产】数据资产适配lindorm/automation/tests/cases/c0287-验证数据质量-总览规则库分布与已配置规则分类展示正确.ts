// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0287",
  "title": "验证【数据质量-总览】规则库分布与已配置规则分类展示正确",
  "steps": [
    {
      "action": "进入【数据质量 → 总览】页面",
      "expected": "1)页面展示「数据质量概览」\n2)左侧菜单展示「总览」「规则库配置」「规则集管理」「规则任务管理」「校验结果查询」「数据质量报告」「通用配置」「项目管理」"
    },
    {
      "action": "查看「规则库分布」和「已配置规则分类」图表",
      "expected": "1)图表可见并展示完整性、有效性、唯一性、统计性、一致性、时效性、合理性等分类\n2)图表分类与规则库列表分类一致"
    }
  ]
} as const;

test.describe("验证【数据质量-总览】规则库分布与已配置规则分类展示正确", () => {
  test("C0287 验证【数据质量-总览】规则库分布与已配置规则分类展示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
