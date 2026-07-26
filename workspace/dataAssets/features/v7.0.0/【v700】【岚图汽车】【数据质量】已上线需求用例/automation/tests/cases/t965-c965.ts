// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C965",
  "title": "验证【「已配置报告」】「新建报告」-关联数据表新增删除功能正常",
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
      "action": "点击「新增」按钮",
      "expected": "新增一行数据表记录"
    },
    {
      "action": "点击「删除」按钮",
      "expected": "删除一行数据表记录"
    }
  ]
} as const;

test.describe("验证【「已配置报告」】「新建报告」-关联数据表新增删除功能正常", () => {
  test("C965 验证【「已配置报告」】「新建报告」-关联数据表新增删除功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
