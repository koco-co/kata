// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C036",
  "title": "验证【多表-同源比对】功能正常",
  "steps": [
    {
      "action": "新建多表比对，左表选择 doris_demo_data_types_source",
      "expected": "右表数据源输入框自动回填左表所在数据源，且置灰不可修改"
    },
    {
      "action": "右表选择 doris_demo1_data_types_source，点击【下一步】",
      "expected": "进入字段选择/映射步骤，页面显示两张表的字段列表"
    },
    {
      "action": "点击【同名映射】",
      "expected": "字段类型一致的字段（如 user_id BIGINT→BIGINT、name VARCHAR→VARCHAR）自动建立映射；类型不一致的字段（如 age TINYINT vs INT、price DECIMAL vs VARCHAR）不映射，并在页面显示提示\"主表与对照表字段类型不一致，无法比对\""
    },
    {
      "action": "勾选 user_id 为主键",
      "expected": "主键勾选成功，user_id 行显示主键标记"
    },
    {
      "action": "勾选【记录数百分比差异】，设置阈值为 0%",
      "expected": "勾选成功；阈值输入框显示 0%"
    },
    {
      "action": "点击【创建规则】",
      "expected": "规则创建成功，规则列表新增一条多表比对记录"
    },
    {
      "action": "点击【立即运行】，等待实例完成，查看结果",
      "expected": "质量实例状态\"运行成功\"，校验结果显示\"校验不通过\"（左表 3 条、右表 2 条，记录数差异 33%，超出 0% 阈值）"
    },
    {
      "action": "编辑规则，将【记录数百分比差异】阈值修改为 100%",
      "expected": "编辑保存成功，规则页面显示阈值已更新为 100%"
    },
    {
      "action": "再次点击【立即运行】，等待实例完成，查看结果",
      "expected": "质量实例状态\"运行成功\"，校验结果显示\"校验通过\"（记录数差异 33% ≤ 100%）"
    }
  ]
} as const;

test.describe("验证【多表-同源比对】功能正常", () => {
  test("C036 验证【多表-同源比对】功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
