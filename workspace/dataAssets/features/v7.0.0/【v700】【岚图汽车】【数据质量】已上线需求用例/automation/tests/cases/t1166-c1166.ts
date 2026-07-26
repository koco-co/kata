// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1166",
  "title": "验证【数据质量 通用配置-json格式校验管理 导入】导入非xlsx格式文件时报错",
  "steps": [
    {
      "action": "进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成",
      "expected": "json格式校验管理页面正常打开，列表加载完成"
    },
    {
      "action": "点击列表右上角【导入】按钮，在导入弹窗的文件上传区域选择 test_import.csv 文件",
      "expected": "系统拒绝上传或提示文件格式错误，仅支持xlsx格式文件"
    }
  ]
} as const;

test.describe("验证【数据质量 通用配置-json格式校验管理 导入】导入非xlsx格式文件时报错", () => {
  test("C1166 验证【数据质量 通用配置-json格式校验管理 导入】导入非xlsx格式文件时报错", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
