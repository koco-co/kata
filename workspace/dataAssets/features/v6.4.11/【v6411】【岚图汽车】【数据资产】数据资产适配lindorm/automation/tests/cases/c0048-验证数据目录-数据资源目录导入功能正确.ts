// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0048",
  "title": "验证【数据目录】-【数据资源目录导入】功能正确",
  "steps": [
    {
      "action": "数据资源目录导入弹窗UI CHECK",
      "expected": "title 展示“数据资源目录导入”\n上传文件按钮 ，支持XLSX文件类型\n下载模板 按钮\n取消，确定按钮，关闭弹窗按钮“X”"
    },
    {
      "action": "点击【上传文件】按钮",
      "expected": "弹选择文件弹窗，过滤非XLSX文件"
    },
    {
      "action": "点击【下载模板】按钮",
      "expected": "resource_catalog_template.xlsx文件下载成功"
    },
    {
      "action": "查看【下载模板】XLSX文件",
      "expected": "展示“一级目录\t二级目录\t三级目录\t四级目录\t五级目录\t六级目录” 列"
    },
    {
      "action": "上传模板文件",
      "expected": "提示“上传成功”，目录新增正确"
    }
  ]
} as const;

test.describe("验证【数据目录】-【数据资源目录导入】功能正确", () => {
  test("C0048 验证【数据目录】-【数据资源目录导入】功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
