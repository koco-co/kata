// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1173",
  "title": "验证【数据质量 通用配置-json格式校验管理 导入】导入正确文件全流程（重复则跳过）",
  "steps": [
    {
      "action": "进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成",
      "expected": "json格式校验管理页面打开，列表显示已有key数据"
    },
    {
      "action": "点击列表右上角【导入】按钮",
      "expected": "弹出导入弹窗，标题为「导入标准」，包含「重复处理规则」选项（默认选中「重复则跳过」）和文件上传区域"
    },
    {
      "action": "确认重复处理规则为默认「重复则跳过」，在文件上传区域上传 json_format_import_template.xlsx 文件，点击【确定】按钮，等待校验和导入接口响应完成",
      "expected": "弹窗关闭，列表刷新，导入文件中的key数据成功出现在列表中：\n1) importKey1 出现在列表第一层级，中文名称显示「导入键一」，value格式显示 ^[a-z]+$\n2) importKey2 出现在列表第一层级，中文名称显示「导入键二」\n3) importKey1 展开后显示子层级 subImport1，中文名称显示「子导入键一」\n4) importKey2的value格式列显示为空（-）"
    }
  ]
} as const;

test.describe("验证【数据质量 通用配置-json格式校验管理 导入】导入正确文件全流程（重复则跳过）", () => {
  test("C1173 验证【数据质量 通用配置-json格式校验管理 导入】导入正确文件全流程（重复则跳过）", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
