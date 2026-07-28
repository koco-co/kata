// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0089",
  "title": "验证无主键时且关系下字段值全满足期望条件",
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
      "action": "配置校验表：选择表：doris_check_table字段：status期望值：= \"active\"主键：不选择",
      "expected": "配置成功"
    },
    {
      "action": "添加对比表：选择对比表：doris_compare_table_1分区：无分区，跳过对比字段：status期望值：= \"active\"主键：不选择",
      "expected": "添加成功"
    },
    {
      "action": "选择判断关系为「且」",
      "expected": "选择成功"
    },
    {
      "action": "保存并运行规则任务",
      "expected": "运行成功, 状态为「校验通过」"
    }
  ]
} as const;

test.describe("验证无主键时且关系下字段值全满足期望条件", () => {
  test("C0089 验证无主键时且关系下字段值全满足期望条件", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
