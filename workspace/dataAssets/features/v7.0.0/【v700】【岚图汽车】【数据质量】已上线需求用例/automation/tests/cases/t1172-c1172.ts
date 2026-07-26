// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1172",
  "title": "验证【数据质量 通用配置-json格式校验管理 导入】导入模板下载功能",
  "steps": [
    {
      "action": "进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成",
      "expected": "json格式校验管理页面打开，列表显示已有key数据"
    },
    {
      "action": "点击【导入】按钮，在导入弹窗中点击【下载模板】链接，等待文件下载完成",
      "expected": "浏览器下载文件，文件命名为 json_format_import_template.xlsx，打开文件后包含5个Sheet（分别对应一层、二层、三层、四层、五层）：\n1) 一层Sheet包含「*key」、「中文名称」、「value格式」列\n2) 二至五层Sheet各自包含「*上一层级的key名」、「\\\\*key」、「中文名称」、「value格式」列"
    }
  ]
} as const;

test.describe("验证【数据质量 通用配置-json格式校验管理 导入】导入模板下载功能", () => {
  test("C1172 验证【数据质量 通用配置-json格式校验管理 导入】导入模板下载功能", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
