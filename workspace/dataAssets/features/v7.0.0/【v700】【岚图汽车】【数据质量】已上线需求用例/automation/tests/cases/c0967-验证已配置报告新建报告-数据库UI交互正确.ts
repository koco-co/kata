// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0967",
  "title": "验证【「已配置报告」】「新建报告」-数据库UI交互正确",
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
      "action": "选择任意数据源后, 点击「数据库」下拉框",
      "expected": "展示所选数据源下有权限的数据库列表"
    },
    {
      "action": "「数据库」为空，点击确定",
      "expected": "1) 确定前: 置灰提示「请选择数据库」\n2)确定后: 置红提示「请选择数据库」"
    },
    {
      "action": "选择${数据库A}",
      "expected": "1）单选\n2）数据库值更新为所选值${数据库A}\n3) 清空已选的数据表信息"
    }
  ]
} as const;

test.describe("验证【「已配置报告」】「新建报告」-数据库UI交互正确", () => {
  test("C0967 验证【「已配置报告」】「新建报告」-数据库UI交互正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
