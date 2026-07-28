// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0390",
  "title": "验证数据权限-「新增/编辑」-权限范围选择交互正确",
  "steps": [
    {
      "action": "查看“数据源”下拉列表",
      "expected": "1）默认不选中\n2）下拉列表为资产引入的所有数据源\n3）编辑状态（编辑数据权限）下，“数据源”为不可修改状态"
    },
    {
      "action": "选择数据源后，查看“数据库”下拉列表",
      "expected": "“数据库”下拉选项为当前数据源下所有schema+全部"
    },
    {
      "action": "选择数据库（选择除“全部”之外的schema）后，查看“数据表”下拉列表",
      "expected": "“数据表”下拉选项为所选schema下所有表+全部"
    },
    {
      "action": "选择数据库为“全部”",
      "expected": "“数据表”下拉选项只有“全部”且直接选中"
    },
    {
      "action": "选择多张数据表后，点击【添加】",
      "expected": "1）下方列表新增该记录；\n2）“数据库”、“数据表”筛选项清空，“数据源”不清空且不可切换"
    },
    {
      "action": "选择全部数据库后，点击【添加】",
      "expected": "1）下方列表新增该记录；\n2）“数据库”、“数据表”筛选项清空，“数据源”不清空且不可切换"
    },
    {
      "action": "选择某一数据库，全部数据表后，点击【添加】",
      "expected": "1）下放列表新增该记录；\n2）“数据库”、“数据表”筛选项清空，“数据源”不清空且不可切换"
    },
    {
      "action": "列表中点击【删除】",
      "expected": "1）该记录被删除；\n2）「行列权限配置」中对应的表配置记录全部删除"
    }
  ]
} as const;

test.describe("验证数据权限-「新增/编辑」-权限范围选择交互正确", () => {
  test("C0390 验证数据权限-「新增/编辑」-权限范围选择交互正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
