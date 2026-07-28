// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0173",
  "title": "验证数据库列表-导出元数据功能正确",
  "steps": [
    {
      "action": "点击【导出元数据】",
      "expected": "原“导入元数据”弹窗去除“选择数据源”，只保留“数据库”选择项；"
    },
    {
      "action": "选择具体数据库；\n点击【确定】",
      "expected": "导出文件内容为所选数据库下，所有元数据（表+视图）信息"
    },
    {
      "action": "选择“全部”；\n点击【确定】",
      "expected": "导出文件内容为当前数据源下，所有元数据（表+视图）信息"
    }
  ]
} as const;

test.describe("验证数据库列表-导出元数据功能正确", () => {
  test("C0173 验证数据库列表-导出元数据功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
