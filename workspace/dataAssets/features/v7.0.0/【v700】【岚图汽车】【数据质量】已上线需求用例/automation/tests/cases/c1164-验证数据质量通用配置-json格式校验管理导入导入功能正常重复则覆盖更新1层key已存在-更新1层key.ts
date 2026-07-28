// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1164",
  "title": "验证【数据质量 通用配置-json格式校验管理 导入】导入功能正常(重复则覆盖更新, 1层key已存在 -> 更新1层key)",
  "steps": [
    {
      "action": "进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成",
      "expected": "页面正常加载，existKey1 的 value格式显示 ^[a-z]+$，中文名称显示「原始键」"
    },
    {
      "action": "点击【导入】按钮，将重复处理规则切换为「重复则覆盖更新」，上传XLSX文件，点击【确定】按钮，等待接口响应完成",
      "expected": "弹窗关闭，列表刷新，existKey1 的 value格式更新为 ^[A-Z]+$，中文名称更新为「更新键」"
    }
  ]
} as const;

test.describe("验证【数据质量 通用配置-json格式校验管理 导入】导入功能正常(重复则覆盖更新, 1层key已存在 -> 更新1层key)", () => {
  test("C1164 验证【数据质量 通用配置-json格式校验管理 导入】导入功能正常(重复则覆盖更新, 1层key已存在 -> 更新1层key)", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
