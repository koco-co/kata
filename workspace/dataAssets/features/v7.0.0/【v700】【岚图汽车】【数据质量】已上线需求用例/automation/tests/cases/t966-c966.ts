// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C966",
  "title": "验证【「已配置报告」】「新建报告」-数据表UI交互正确",
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
      "action": "选择任意数据源和数据库后, 点击「数据表」下拉框",
      "expected": "展示所选数据库下有权限的数据表列表, 支持多选"
    },
    {
      "action": "「数据表」为空，点击确定",
      "expected": "1) 确定前: 置灰提示「请选择数据表」\n2)确定后: 置红提示「请选择数据表」"
    },
    {
      "action": "选择${数据表A}",
      "expected": "1）多选\n2）数据表值更新为所选值${数据表A}"
    }
  ]
} as const;

test.describe("验证【「已配置报告」】「新建报告」-数据表UI交互正确", () => {
  test("C966 验证【「已配置报告」】「新建报告」-数据表UI交互正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
