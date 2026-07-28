// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0291",
  "title": "验证【数据质量-总览】最近一次更新时间随统计刷新正确",
  "steps": [
    {
      "action": "进入【数据质量 → 总览】页面",
      "expected": "1)页面展示「数据质量概览」\n2)左侧菜单展示「总览」「规则库配置」「规则集管理」「规则任务管理」「校验结果查询」「数据质量报告」「通用配置」「项目管理」"
    },
    {
      "action": "触发一次规则任务执行后返回【数据质量 → 总览】查看「最近一次更新时间」",
      "expected": "1)最近一次更新时间刷新为任务执行后的时间\n2)刷新后统计卡片和近期异常结果同步更新"
    }
  ]
} as const;

test.describe("验证【数据质量-总览】最近一次更新时间随统计刷新正确", () => {
  test("C0291 验证【数据质量-总览】最近一次更新时间随统计刷新正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
