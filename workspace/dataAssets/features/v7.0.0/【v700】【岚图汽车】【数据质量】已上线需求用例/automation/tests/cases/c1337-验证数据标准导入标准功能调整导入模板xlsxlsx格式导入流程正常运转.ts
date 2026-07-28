// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1337",
  "title": "验证【数据标准导入标准功能调整】「导入模板」xls、xlsx格式导入流程正常运转",
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
      "expected": "成功提交"
    },
    {
      "action": "点击【上传文件】按钮，提交导入文件（XLSX文件）",
      "expected": "成功导入，显示导入结果【导入总量/导入成功/导入失败/下载异常记录】"
    },
    {
      "action": "点击【确认】按钮",
      "expected": "成功提交"
    },
    {
      "action": "点击【上传文件】按钮，提交导入文件（XLS文件）",
      "expected": "显示导入结果【导入总量/导入成功/导入失败/下载异常记录】"
    },
    {
      "action": "点击【确认】按钮",
      "expected": ""
    }
  ]
} as const;

test.describe("验证【数据标准导入标准功能调整】「导入模板」xls、xlsx格式导入流程正常运转", () => {
  test("C1337 验证【数据标准导入标准功能调整】「导入模板」xls、xlsx格式导入流程正常运转", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
