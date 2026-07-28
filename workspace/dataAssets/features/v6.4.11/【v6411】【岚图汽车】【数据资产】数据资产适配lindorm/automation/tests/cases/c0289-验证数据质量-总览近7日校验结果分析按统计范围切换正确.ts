// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0289",
  "title": "验证【数据质量-总览】近7日校验结果分析按统计范围切换正确",
  "steps": [
    {
      "action": "进入【数据质量 → 总览】页面",
      "expected": "1)页面展示「数据质量概览」\n2)左侧菜单展示「总览」「规则库配置」「规则集管理」「规则任务管理」「校验结果查询」「数据质量报告」「通用配置」「项目管理」"
    },
    {
      "action": "在「近7日校验结果分析」中切换「统计范围」",
      "expected": "1)统计范围可选择全部或指定数据表\n2)切换后趋势图刷新且不影响其它总览模块"
    }
  ]
} as const;

test.describe("验证【数据质量-总览】近7日校验结果分析按统计范围切换正确", () => {
  test("C0289 验证【数据质量-总览】近7日校验结果分析按统计范围切换正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
