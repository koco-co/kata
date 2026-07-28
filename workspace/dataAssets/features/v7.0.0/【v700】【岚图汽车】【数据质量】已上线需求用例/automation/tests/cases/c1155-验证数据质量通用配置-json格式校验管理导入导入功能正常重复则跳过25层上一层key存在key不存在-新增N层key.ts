// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1155",
  "title": "验证【数据质量 通用配置-json格式校验管理 导入】导入功能正常(重复则跳过, 2~5层上一层key存在+key不存在 -> 新增N层key)",
  "steps": [
    {
      "action": "进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成",
      "expected": "页面正常加载，parentD 行无「+」展开图标（无子层级）"
    },
    {
      "action": "点击【导入】按钮，确认重复处理规则为「重复则跳过」，上传XLSX文件，点击【确定】按钮，等待接口响应完成",
      "expected": "弹窗关闭，列表刷新，parentD 行出现「+」展开图标，展开后显示新增的子层级 newChild2，中文名称显示「新增子键」，value格式显示 ^[a-z]+$"
    }
  ]
} as const;

test.describe("验证【数据质量 通用配置-json格式校验管理 导入】导入功能正常(重复则跳过, 2~5层上一层key存在+key不存在 -> 新增N层key)", () => {
  test("C1155 验证【数据质量 通用配置-json格式校验管理 导入】导入功能正常(重复则跳过, 2~5层上一层key存在+key不存在 -> 新增N层key)", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
