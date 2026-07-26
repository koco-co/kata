// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1163",
  "title": "验证【数据质量 通用配置-json格式校验管理 导入】导入功能正常(重复则覆盖更新, 1层key不存在 -> 新增1层key)",
  "steps": [
    {
      "action": "进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成",
      "expected": "页面正常加载，列表中不存在 brandNewKey1"
    },
    {
      "action": "点击【导入】按钮，将重复处理规则切换为「重复则覆盖更新」，上传XLSX文件，点击【确定】按钮，等待接口响应完成",
      "expected": "弹窗关闭，列表刷新，新增 brandNewKey1 出现在列表中，中文名称显示「全新键」，value格式显示 ^\\\\d+$"
    }
  ]
} as const;

test.describe("验证【数据质量 通用配置-json格式校验管理 导入】导入功能正常(重复则覆盖更新, 1层key不存在 -> 新增1层key)", () => {
  test("C1163 验证【数据质量 通用配置-json格式校验管理 导入】导入功能正常(重复则覆盖更新, 1层key不存在 -> 新增1层key)", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
