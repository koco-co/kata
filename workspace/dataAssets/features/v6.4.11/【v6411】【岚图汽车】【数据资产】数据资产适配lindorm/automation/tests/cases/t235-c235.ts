// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C235",
  "title": "验证【标准管理】-【落标检查】-【落标检查结果】批量导出",
  "steps": [
    {
      "action": "进入【资产】-【数据标准】-【标准管理】-【标准定义】页面",
      "expected": "进入成功"
    },
    {
      "action": "切换到【落标检查结果】",
      "expected": "切换成功"
    },
    {
      "action": "勾选导出结果，点击 [导出] 按钮",
      "expected": "弹出导出选择框，支持选择“检查列表内容/检查列表内容+不达标明细数据”"
    },
    {
      "action": "选择 “检查列表内容”，点击 [导出] 按钮",
      "expected": "按照选择内容，自动进行下载任务"
    },
    {
      "action": "重复前置操作，选择 “检查列表内容+不达标明细数据”",
      "expected": "按照选择内容，自动进行下载任务"
    }
  ]
} as const;

test.describe("验证【标准管理】-【落标检查】-【落标检查结果】批量导出", () => {
  test("C235 验证【标准管理】-【落标检查】-【落标检查结果】批量导出", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
