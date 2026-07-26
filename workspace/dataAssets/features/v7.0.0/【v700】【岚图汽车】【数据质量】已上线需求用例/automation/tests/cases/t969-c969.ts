// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C969",
  "title": "验证【「已配置报告」】「新建报告」-规则范围UI交互正确",
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
      "action": "点击「规则范围」下拉框",
      "expected": "1) 默认选择全部\n2)支持选择完整性/有效性/唯一性/准确性/及时性/周期性/全部，支持多选"
    },
    {
      "action": "置空「规则范围」, 点击确定",
      "expected": "1) 置空后: 选择框置灰提示「请选择规则范围」\n2) 确定后: 选择框下方置红提示「请选择规则范围」"
    },
    {
      "action": "置空「规则范围」, 选择${范围A}, 点击确定",
      "expected": "1) 支持多选\n2) 值更新为所选值${范围A}"
    }
  ]
} as const;

test.describe("验证【「已配置报告」】「新建报告」-规则范围UI交互正确", () => {
  test("C969 验证【「已配置报告」】「新建报告」-规则范围UI交互正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
