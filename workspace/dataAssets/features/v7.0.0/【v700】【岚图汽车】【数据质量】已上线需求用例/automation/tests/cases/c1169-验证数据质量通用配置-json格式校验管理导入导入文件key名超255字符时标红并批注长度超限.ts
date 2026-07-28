// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1169",
  "title": "验证【数据质量 通用配置-json格式校验管理 导入】导入文件key名超255字符时标红并批注长度超限",
  "steps": [
    {
      "action": "进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成",
      "expected": "json格式校验管理页面打开，列表显示已有key数据"
    },
    {
      "action": "点击【导入】按钮，上传包含256字符key的XLSX文件，点击【确定】按钮，等待校验完成",
      "expected": "弹窗提示「导入表格中存在错误数据，请检查后重新导入」，并提供导出错误文件的入口，无法完成导入"
    },
    {
      "action": "点击导出错误文件入口，等待文件下载完成",
      "expected": "下载文件命名为 json_format_error_YYYYMMDD.xlsx（YYYYMMDD为执行当天日期），打开文件后256字符key所在单元格显示红色标注，批注内容为「长度超限」"
    }
  ]
} as const;

test.describe("验证【数据质量 通用配置-json格式校验管理 导入】导入文件key名超255字符时标红并批注长度超限", () => {
  test("C1169 验证【数据质量 通用配置-json格式校验管理 导入】导入文件key名超255字符时标红并批注长度超限", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
