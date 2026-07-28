// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0037",
  "title": "验证【多表-doris-mysql跨源比对】功能正常",
  "steps": [
    {
      "action": "新建多表比对，左表选择 doris_demo_data_types_source，过滤条件输入前一天 UTC0 日期分区值（如 `part_date='2026-04-06'`）",
      "expected": "右表数据源下拉框不自动填充左表数据源，允许选择质量项目下所有已授权数据源（包括 MySQL）"
    },
    {
      "action": "右表数据源选择 MySQL 数据源，右表选择 mysql_demo_data_types_source，点击【下一步】",
      "expected": "成功进入字段选择/映射步骤"
    },
    {
      "action": "点击【同名映射】",
      "expected": "左右表字段名称相同但类型均不一致（Doris BIGINT vs MySQL VARCHAR 等）；不生成任何映射；页面提示\"主表与对照表字段类型不一致，无法比对\"（至少显示一处提示）"
    },
    {
      "action": "手动勾选 user_id 为主键",
      "expected": "主键勾选成功，user_id 行显示主键标记"
    },
    {
      "action": "勾选【记录数百分比差异】，设置阈值为 0%",
      "expected": "勾选成功；阈值输入框显示 0%"
    },
    {
      "action": "点击【创建规则】",
      "expected": "规则创建成功，规则列表新增一条跨源多表比对记录"
    },
    {
      "action": "点击【立即运行】，等待实例完成，查看结果",
      "expected": "质量实例状态\"运行成功\"，校验结果显示\"校验不通过\"（左表 3 条、右表 2 条，差异 33% > 0%）"
    },
    {
      "action": "编辑规则，将【记录数百分比差异】阈值修改为 50%",
      "expected": "编辑保存成功，规则页面显示阈值已更新为 50%"
    },
    {
      "action": "再次点击【立即运行】，等待实例完成，查看结果",
      "expected": "质量实例状态\"运行成功\"，校验结果显示\"校验通过\"（记录数差异 33% ≤ 50%）"
    }
  ]
} as const;

test.describe("验证【多表-doris-mysql跨源比对】功能正常", () => {
  test("C0037 验证【多表-doris-mysql跨源比对】功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
