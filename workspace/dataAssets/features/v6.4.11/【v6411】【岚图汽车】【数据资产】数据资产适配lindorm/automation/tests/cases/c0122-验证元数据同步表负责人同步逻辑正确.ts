// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0122",
  "title": "验证【元数据同步】_【表负责人】同步逻辑正确",
  "steps": [
    {
      "action": "查看“是否指定表负责人”默认值",
      "expected": "默认的是否指定表负责人是“否”"
    },
    {
      "action": "“是否指定表负责人”，选择【否】",
      "expected": "不弹出下拉框"
    },
    {
      "action": "“是否指定表负责人”，选择【是】",
      "expected": "弹出下拉框"
    },
    {
      "action": "支持【准确搜索】表负责人",
      "expected": "可以精确查找到负责人"
    },
    {
      "action": "支持【模糊搜索】表负责人",
      "expected": "可以模糊查找到负责人"
    },
    {
      "action": "查看下拉列表用户选项",
      "expected": "展示的是在该租户下，数据资产权限是【数据开发】和【管理员】的用户"
    },
    {
      "action": "1）选择表负责人${TABLE_OWNER}\n2）立即同步，同步完成后，查看表详情",
      "expected": "表详情内显示表负责人为${TABLE_OWNER}"
    }
  ]
} as const;

test.describe("验证【元数据同步】_【表负责人】同步逻辑正确", () => {
  test("C0122 验证【元数据同步】_【表负责人】同步逻辑正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
