// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1359",
  "title": "验证【「数据标准」-「标准定义」字段调整】「标准管理」-「标准定义」-「导入模板」必填项标识修改",
  "steps": [
    {
      "action": "进入【资产】-【数据标准】-【标准管理】-【标准定义】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击【导入标准】按钮",
      "expected": "进入[导入标准]配置页面"
    },
    {
      "action": "点击【下载模板】按钮",
      "expected": "自动下载导入模板"
    },
    {
      "action": "打开下载文件",
      "expected": "5. 必填显示已取消"
    },
    {
      "action": "检查表头【英文缩写（不支持大写字母）】是否取消必填显示",
      "expected": ""
    }
  ]
} as const;

test.describe("验证【「数据标准」-「标准定义」字段调整】「标准管理」-「标准定义」-「导入模板」必填项标识修改", () => {
  test("C1359 验证【「数据标准」-「标准定义」字段调整】「标准管理」-「标准定义」-「导入模板」必填项标识修改", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
