// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C288",
  "title": "验证【数据质量-总览】校验异常top排名展示正确",
  "steps": [
    {
      "action": "进入【数据质量 → 总览】页面",
      "expected": "1)页面展示「数据质量概览」\n2)左侧菜单展示「总览」「规则库配置」「规则集管理」「规则任务管理」「校验结果查询」「数据质量报告」「通用配置」「项目管理」"
    },
    {
      "action": "查看「校验异常top排名」列表",
      "expected": "1)列表列包含「排名」「数据表」「所属数据库」「所属数据源」「校验任务数」「校验失败/不通过数」「最近一次校验时间」\n2)排名按失败/不通过数和最近一次校验时间展示正确"
    }
  ]
} as const;

test.describe("验证【数据质量-总览】校验异常top排名展示正确", () => {
  test("C288 验证【数据质量-总览】校验异常top排名展示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
