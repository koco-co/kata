// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C404",
  "title": "验证权限回收列表-筛选功能正确",
  "steps": [
    {
      "action": "默认查询：\n默认状态下点击【查询】",
      "expected": "列表展示当前租户下所有申请并通过审批的权限记录"
    },
    {
      "action": "级联查询：\n选择“数据源”",
      "expected": "选择“数据源”后，“数据库”下拉选项为所选数据源下所有已同步的db"
    },
    {
      "action": "独立查询：\n分别针对每个筛选项进行查询操作",
      "expected": "根据“数据表”模糊查询结果正确；\n根据“数据源”筛选结果正确；\n根据“数据源-数据库”筛选结果正确；\n根据“表权限”筛选结果正确；\n根据“申请人”模糊查询结果正确；"
    },
    {
      "action": "合并查询：\n每个筛选项都选择；\n点击【查询】",
      "expected": "筛选结果正确"
    },
    {
      "action": "重置查询：\n每个筛选项都选择，并进行查询；\n点击【重置】",
      "expected": "所有筛选项都恢复默认状态；列表显示当前租户下所有申请并通过审批的权限记录"
    },
    {
      "action": "“状态”列筛选“已回收”",
      "expected": "列表返回“已回收”状态的权限记录"
    },
    {
      "action": "“状态”列筛选“未回收”",
      "expected": "列表返回“未回收”状态的权限记录"
    }
  ]
} as const;

test.describe("验证权限回收列表-筛选功能正确", () => {
  test("C404 验证权限回收列表-筛选功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
