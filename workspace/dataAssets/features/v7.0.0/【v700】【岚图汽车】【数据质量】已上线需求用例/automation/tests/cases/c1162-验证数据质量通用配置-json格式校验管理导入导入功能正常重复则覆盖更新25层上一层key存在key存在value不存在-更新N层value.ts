// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1162",
  "title": "验证【数据质量 通用配置-json格式校验管理 导入】导入功能正常(重复则覆盖更新, 2~5层上一层key存在+key存在+value不存在 -> 更新N层value)",
  "steps": [
    {
      "action": "进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成",
      "expected": "页面正常加载，展开 parentA 后 childA 的 value格式显示为空（-）"
    },
    {
      "action": "点击【导入】按钮，将重复处理规则切换为「重复则覆盖更新」，上传XLSX文件，点击【确定】按钮，等待接口响应完成",
      "expected": "弹窗关闭，列表刷新，展开 parentA 后 childA 的 value格式更新为 ^[0-9]+$，中文名称更新为「更新子键」"
    }
  ]
} as const;

test.describe("验证【数据质量 通用配置-json格式校验管理 导入】导入功能正常(重复则覆盖更新, 2~5层上一层key存在+key存在+value不存在 -> 更新N层value)", () => {
  test("C1162 验证【数据质量 通用配置-json格式校验管理 导入】导入功能正常(重复则覆盖更新, 2~5层上一层key存在+key存在+value不存在 -> 更新N层value)", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
