// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1154",
  "title": "验证【数据质量 通用配置-json格式校验管理 导入】导入功能正常(重复则跳过, 2~5层上一层key不存在 -> 报错)",
  "steps": [
    {
      "action": "进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成",
      "expected": "json格式校验管理页面正常打开，列表加载完成"
    },
    {
      "action": "点击【导入】按钮，确认重复处理规则为「重复则跳过」，上传XLSX文件，点击【确定】按钮，等待接口响应完成",
      "expected": "导入失败或部分失败，系统提示上一层级key名 noParent 不存在，orphanKey2 未被导入"
    }
  ]
} as const;

test.describe("验证【数据质量 通用配置-json格式校验管理 导入】导入功能正常(重复则跳过, 2~5层上一层key不存在 -> 报错)", () => {
  test("C1154 验证【数据质量 通用配置-json格式校验管理 导入】导入功能正常(重复则跳过, 2~5层上一层key不存在 -> 报错)", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
