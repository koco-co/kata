// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C414",
  "title": "验证「我的权限查看」-列表筛选功能正常",
  "steps": [
    {
      "action": "默认查询：\n默认状态下点击【查询】",
      "expected": "列表显示当前用户所有未删除的表权限信息"
    },
    {
      "action": "级联查询：\n选择“数据源”",
      "expected": "选择“数据源”后，“数据库”下拉选项为所选数据源下所有已同步的db"
    },
    {
      "action": "独立查询：\n分别针对每个筛选项进行查询操作",
      "expected": "1）根据“数据表”筛选结果正确；\n2）根据“数据源”筛选结果正确；\n3）根据“数据源-数据库”筛选结果正确；\n4）根据“表权限”筛选结果正确；\n5）根据“负责人”筛选结果正确；"
    },
    {
      "action": "根据“数据目录”筛选：\n点击任一数据目录",
      "expected": "列表展示对应数据目录下所有数据"
    },
    {
      "action": "合并查询：\n每个筛选项都选择；\n选择一个数据目录；\n点击【查询】",
      "expected": "筛选结果正确"
    },
    {
      "action": "重置查询：\n每个筛选项都选择，并进行查询；\n点击【重置】",
      "expected": "1）所有筛选项都恢复默认状态；\n2）列表显示所有未删除的数据权限信息"
    }
  ]
} as const;

test.describe("验证「我的权限查看」-列表筛选功能正常", () => {
  test("C414 验证「我的权限查看」-列表筛选功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
