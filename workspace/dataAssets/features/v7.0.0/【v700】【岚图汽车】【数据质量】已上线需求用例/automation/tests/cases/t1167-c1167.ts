// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1167",
  "title": "验证【数据质量 通用配置-json格式校验管理 导入】导入文件二层key上一层级key名无法匹配时标红并批注提示",
  "steps": [
    {
      "action": "进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成",
      "expected": "json格式校验管理页面打开，列表显示已有key数据"
    },
    {
      "action": "点击【导入】按钮，上传二层Sheet中上一层级key为 nonExistParentKey 的XLSX文件，点击【确定】按钮，等待校验完成",
      "expected": "弹窗提示「导入表格中存在错误数据，请检查后重新导入」，并提供【导出错误文件】入口，无法完成导入"
    },
    {
      "action": "点击导出错误文件入口，等待文件下载完成，打开下载的错误文件",
      "expected": "二层Sheet中「\\\\*上一层级的key名」为 nonExistParentKey 的单元格显示红色标注，批注内容为「上一层级无相同key名匹配」"
    }
  ]
} as const;

test.describe("验证【数据质量 通用配置-json格式校验管理 导入】导入文件二层key上一层级key名无法匹配时标红并批注提示", () => {
  test("C1167 验证【数据质量 通用配置-json格式校验管理 导入】导入文件二层key上一层级key名无法匹配时标红并批注提示", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
