// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0974",
  "title": "验证「已配置报告」-规则范围筛选",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【数据质量报告】页面",
      "expected": "成功进入「已配置报告」页面"
    },
    {
      "action": "点击表头「规则范围」的筛选图标",
      "expected": "1) 支持选择完整性/有效性/唯一性/准确性/及时性/周期性/全部，支持多选\n2) 按钮: 重置/确定, 重置默认置灰"
    },
    {
      "action": "勾选「完整性」，点击「确定」",
      "expected": "显示「规则范围」为「完整性」的记录"
    },
    {
      "action": "重置后, 再次点击「规则范围」筛选图标，勾选「完整性」「有效性」，点击「确定」",
      "expected": "显示「规则范围」为「完整性」或「有效性」的记录"
    },
    {
      "action": "重置后, 再次点击「规则范围」筛选图标，勾选「完整性」，点击「确定」, 然后在「报告名称」中输入${name}并查询",
      "expected": "显示「规则范围」为「完整性」且「报告名称」为${name}的记录"
    }
  ]
} as const;

test.describe("验证「已配置报告」-规则范围筛选", () => {
  test("C0974 验证「已配置报告」-规则范围筛选", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
