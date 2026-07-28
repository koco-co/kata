// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1225",
  "title": "验证【「数据标准」-「标准管理」新增「落标检查」版块】「落标检查」-「落标检查结果」-「导出」选择\"已达标\"落标检查结果，\"检查列表内容+不达标明细数据\"仅导出结果excel文件",
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
      "expected": "弹出导出选择框，支持选择\"检查列表内容/检查列表内容+不达标明细数据\""
    },
    {
      "action": "选择 \"检查列表内容+不达标明细数据\"，点击 [导出] 按钮",
      "expected": "按照选择内容，自动进行下载任务"
    },
    {
      "action": "确认导出文件",
      "expected": "仅有结果excel文件"
    }
  ]
} as const;

test.describe("验证【「数据标准」-「标准管理」新增「落标检查」版块】「落标检查」-「落标检查结果」-「导出」选择\"已达标\"落标检查结果，\"检查列表内容+不达标明细数据\"仅导出结果excel文件", () => {
  test("C1225 验证【「数据标准」-「标准管理」新增「落标检查」版块】「落标检查」-「落标检查结果」-「导出」选择\"已达标\"落标检查结果，\"检查列表内容+不达标明细数据\"仅导出结果excel文件", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
