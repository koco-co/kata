// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0020",
  "title": "验证标准映射-标准映射字段绑定功能正常",
  "steps": [
    {
      "action": "在标准映射列表找到”邮箱地址”标准行，点击【字段映射】按钮，查看字段绑定弹窗",
      "expected": "字段绑定弹窗打开，显示”数据源类型””数据源””数据库””数据表”四级选择控件"
    },
    {
      "action": "“数据源类型”选择 Doris",
      "expected": "“数据源”下拉项展示平台内所有 Doris 数据源名称"
    },
    {
      "action": "“数据源”选择目标 Doris 数据源",
      "expected": "“数据库”下拉项展示该数据源下所有已同步的数据库"
    },
    {
      "action": "“数据库”选择 active_users 所在库",
      "expected": "“数据表”下拉项展示该库下所有已同步的表（包含 active_users）"
    },
    {
      "action": "“数据表”选择 active_users，字段选择 email，点击【确定】",
      "expected": "全局提示”字段绑定成功”；弹窗关闭"
    },
    {
      "action": "在数据标准”邮箱地址”详情中查看【映射记录】tab",
      "expected": "映射记录列表新增一条记录，显示数据源名称、库名、表名 active_users、字段名 email"
    }
  ]
} as const;

test.describe("验证标准映射-标准映射字段绑定功能正常", () => {
  test("C0020 验证标准映射-标准映射字段绑定功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
