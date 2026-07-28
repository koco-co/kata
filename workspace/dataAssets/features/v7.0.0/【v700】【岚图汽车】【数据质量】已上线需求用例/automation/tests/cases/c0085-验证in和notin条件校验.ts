// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0085",
  "title": "验证 in 和 not in 条件校验",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击「新建监控规则」按钮，进入监控规则配置页面",
      "expected": "进入成功"
    },
    {
      "action": "配置「监控对象」后, 选择规则类型为「多表数据内容对比」",
      "expected": "选择成功"
    },
    {
      "action": "校验表：表：doris_check_table字段：category期望值：in A,B主键：不选",
      "expected": "配置成功"
    },
    {
      "action": "对比表：表：doris_compare_table_1字段：category期望值：not in A,B,C主键：不选",
      "expected": "添加成功"
    },
    {
      "action": "选择判断关系为「且」",
      "expected": "选择成功"
    },
    {
      "action": "保存并运行规则任务",
      "expected": "运行成功, 状态为「校验失败」"
    }
  ]
} as const;

test.describe("验证 in 和 not in 条件校验", () => {
  test("C0085 验证 in 和 not in 条件校验", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
