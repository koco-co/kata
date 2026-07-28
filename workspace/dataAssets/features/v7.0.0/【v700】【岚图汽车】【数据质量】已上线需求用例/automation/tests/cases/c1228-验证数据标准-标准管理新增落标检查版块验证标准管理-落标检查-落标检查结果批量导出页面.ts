// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1228",
  "title": "验证【「数据标准」-「标准管理」新增「落标检查」版块】验证「标准管理」-「落标检查」-「落标检查结果」批量导出页面",
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
      "action": "UI Check",
      "expected": "【落标检查总览】\n[请选择导出内容]-检查列表内容/检查列表内容+不达标明细数据"
    }
  ]
} as const;

test.describe("验证【「数据标准」-「标准管理」新增「落标检查」版块】验证「标准管理」-「落标检查」-「落标检查结果」批量导出页面", () => {
  test("C1228 验证【「数据标准」-「标准管理」新增「落标检查」版块】验证「标准管理」-「落标检查」-「落标检查结果」批量导出页面", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
