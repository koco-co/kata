// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1158",
  "title": "验证【数据质量 通用配置-json格式校验管理 导入】导入功能正常(重复则跳过, 1层key已存在 -> 跳过不变)",
  "steps": [
    {
      "action": "进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成",
      "expected": "页面正常加载，skipExist1 的 value格式显示 ^[a-z]+$，中文名称显示「原始键」"
    },
    {
      "action": "点击【导入】按钮，确认重复处理规则为「重复则跳过」，上传XLSX文件，点击【确定】按钮，等待接口响应完成",
      "expected": "弹窗关闭，列表刷新，skipExist1 的 value格式仍为 ^[a-z]+$，中文名称仍为「原始键」，未被修改"
    }
  ]
} as const;

test.describe("验证【数据质量 通用配置-json格式校验管理 导入】导入功能正常(重复则跳过, 1层key已存在 -> 跳过不变)", () => {
  test("C1158 验证【数据质量 通用配置-json格式校验管理 导入】导入功能正常(重复则跳过, 1层key已存在 -> 跳过不变)", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
