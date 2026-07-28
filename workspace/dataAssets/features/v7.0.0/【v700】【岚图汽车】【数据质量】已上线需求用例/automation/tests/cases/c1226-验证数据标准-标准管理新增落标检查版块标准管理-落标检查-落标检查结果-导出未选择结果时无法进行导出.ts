// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1226",
  "title": "验证【「数据标准」-「标准管理」新增「落标检查」版块】「标准管理」-「落标检查」-「落标检查结果」-「导出」未选择结果时无法进行导出",
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
      "action": "不勾选导出结果，点击 [导出] 按钮",
      "expected": "无法交互还是提示选择选择结果"
    }
  ]
} as const;

test.describe("验证【「数据标准」-「标准管理」新增「落标检查」版块】「标准管理」-「落标检查」-「落标检查结果」-「导出」未选择结果时无法进行导出", () => {
  test("C1226 验证【「数据标准」-「标准管理」新增「落标检查」版块】「标准管理」-「落标检查」-「落标检查结果」-「导出」未选择结果时无法进行导出", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
