// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0172",
  "title": "验证数据库列表-导入元数据功能正确",
  "steps": [
    {
      "action": "点击【导入元数据】",
      "expected": "原“导入元数据”弹窗去除“选择数据源”，只保留“上传文件”组件；"
    },
    {
      "action": "准备元数据文件（只包含当前数据源的元数据表信息）；\n上传文件；\n点击确定",
      "expected": "导入元数据成功；\n数据库列表数据刷新"
    },
    {
      "action": "准备元数据文件（包含其他数据源的元数据表信息）；\n上传文件；\n点击确定",
      "expected": "导入元数据失败；\n错误文件内容，错误信息提示正确"
    }
  ]
} as const;

test.describe("验证数据库列表-导入元数据功能正确", () => {
  test("C0172 验证数据库列表-导入元数据功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
