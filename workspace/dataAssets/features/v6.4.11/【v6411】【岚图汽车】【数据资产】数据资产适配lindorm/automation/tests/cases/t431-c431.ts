// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C431",
  "title": "验证数据脱敏-脱敏白名单-查询功能正确",
  "steps": [
    {
      "action": "默认查询：\n默认状态下点击【查询】",
      "expected": "列表显示所有未删除的白名单信息"
    },
    {
      "action": "级联查询：\n依次选择“数据源”、“数据库”",
      "expected": "1）选择“数据源”后，“数据库”下拉列表数据更新成功；\n2）选择“数据库”（非“全部”选项）后，“数据表”下拉列表数据更新成功；\n3）“数据库”选择“全部”选项后，“数据表”只能选择“全部”选项搜索"
    },
    {
      "action": "独立查询：\n分别针对每个筛选项进行查询操作",
      "expected": "1）根据“数据源”筛选结果正确；\n2）根据“数据源-数据库”筛选结果正确；\n3）根据“数据源-数据库-数据表”筛选结果正确；"
    },
    {
      "action": "合并查询：\n每个筛选项都选择；\n点击【查询】",
      "expected": "筛选结果正确"
    },
    {
      "action": "重置查询：\n每个筛选项都选择，并进行查询；\n点击【重置】",
      "expected": "1）所有筛选项都恢复默认状态；\n2）列表显示所有未删除的白名单信息"
    }
  ]
} as const;

test.describe("验证数据脱敏-脱敏白名单-查询功能正确", () => {
  test("C431 验证数据脱敏-脱敏白名单-查询功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
