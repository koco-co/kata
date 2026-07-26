// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1071",
  "title": "验证「数据质量-总览」-「规则库分布」展示正确",
  "steps": [
    {
      "action": "进入【资产-数据质量-总览】页面",
      "expected": "页面正常进入"
    },
    {
      "action": "查看【规则库分布】板块",
      "expected": "包含\n1）标题右上角\"？\"，悬浮提示\"统计规则库中内置的/自定义配置的各个类型规则数量\"\n2）饼状图-展示每个类型的规则占比\n3）列表-每类规则的个数、占比，包括所有内置规则和自定义sql规则，格式为xxx规则 个数，占比，使用率"
    },
    {
      "action": "新增和删除任意规则，等待小时更新，查看饼状图和列表中该规则数量和占比的变化",
      "expected": "变化正确"
    }
  ]
} as const;

test.describe("验证「数据质量-总览」-「规则库分布」展示正确", () => {
  test("C1071 验证「数据质量-总览」-「规则库分布」展示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
