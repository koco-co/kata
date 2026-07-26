// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1338",
  "title": "验证【数据标准导入标准功能调整】「导入标准」文件类型支持提示",
  "steps": [
    {
      "action": "打开下载的导入模板文件，按规则填写内容，保存为XLSX，XLS类型两份文件",
      "expected": "2. 进入成功"
    },
    {
      "action": "进入【资产】-【数据标准】-【标准管理】-【标准定义】页面",
      "expected": "进入[导入标准]配置页面"
    },
    {
      "action": "点击【导入标准】按钮",
      "expected": "显示\"支持XLS、XLSX文件类型\""
    },
    {
      "action": "查看文件类型支持提示",
      "expected": ""
    }
  ]
} as const;

test.describe("验证【数据标准导入标准功能调整】「导入标准」文件类型支持提示", () => {
  test("C1338 验证【数据标准导入标准功能调整】「导入标准」文件类型支持提示", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
