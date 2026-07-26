// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C019",
  "title": "验证标准映射-创建标准映射功能正常",
  "steps": [
    {
      "action": "进入数据标准-标准映射，点击【标准映射】按钮，查看创建标准映射弹窗",
      "expected": "弹窗打开，显示”数据源类型””数据源””数据库”级联选择控件"
    },
    {
      "action": "“数据源类型”选择 Doris",
      "expected": "“数据源”下拉项展示平台内所有 Doris 类型数据源名称"
    },
    {
      "action": "“数据源”选择目标 Doris 数据源",
      "expected": "“数据库”下拉项展示该数据源下所有已同步的数据库（包含 active_users 所在库）"
    },
    {
      "action": "选择 active_users 所在数据库，点击【添加】，再点击【确定】",
      "expected": "全局提示”创建标准映射成功”；标准映射列表新增对应数据库的映射记录"
    }
  ]
} as const;

test.describe("验证标准映射-创建标准映射功能正常", () => {
  test("C019 验证标准映射-创建标准映射功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
