// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C970",
  "title": "验证【「已配置报告」】「新建报告」-生成样式UI交互正确",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【数据质量报告】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击「新建报告」按钮",
      "expected": "弹出「新建报告」弹窗"
    },
    {
      "action": "点击「生成样式」下拉框",
      "expected": "仅支持选择质检式"
    },
    {
      "action": "选择质检式",
      "expected": "1) 单选\n2) 值更新为所选值: 质检式"
    }
  ]
} as const;

test.describe("验证【「已配置报告」】「新建报告」-生成样式UI交互正确", () => {
  test("C970 验证【「已配置报告」】「新建报告」-生成样式UI交互正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
