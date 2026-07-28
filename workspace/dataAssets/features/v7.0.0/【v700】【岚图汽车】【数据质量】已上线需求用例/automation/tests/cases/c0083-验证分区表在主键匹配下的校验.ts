// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0083",
  "title": "验证分区表在主键匹配下的校验",
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
      "action": "校验表：表：doris_check_table分区：选择 dt='20250401'字段：value期望值：> 50主键：id",
      "expected": "配置成功"
    },
    {
      "action": "对比表：表：doris_compare_table_1分区：选择 dt='20250401'字段：value期望值：> 100主键：user_id",
      "expected": "添加成功"
    },
    {
      "action": "选择判断关系为「或」",
      "expected": "选择成功"
    },
    {
      "action": "保存并运行规则任务",
      "expected": "运行成功, 状态为「校验通过」"
    }
  ]
} as const;

test.describe("验证分区表在主键匹配下的校验", () => {
  test("C0083 验证分区表在主键匹配下的校验", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
