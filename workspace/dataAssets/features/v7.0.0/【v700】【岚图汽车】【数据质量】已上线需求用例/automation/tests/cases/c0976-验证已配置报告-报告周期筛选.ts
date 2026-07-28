// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0976",
  "title": "验证「已配置报告」-报告周期筛选",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【数据质量报告】页面",
      "expected": "成功进入「已配置报告」页面"
    },
    {
      "action": "点击表头「报告周期」的筛选图标",
      "expected": "1) 支持选择每天/每周/每月/一次性/自定义, 支持多选\n2) 按钮: 重置/确定, 重置默认置灰"
    },
    {
      "action": "勾选「每天」，点击「确定」",
      "expected": "显示「报告周期」为「每天」的记录"
    },
    {
      "action": "重置后, 再次点击「报告周期」筛选图标，勾选「每周」「每月」，点击「确定」",
      "expected": "显示「报告周期」为「每周」或「每月」的记录"
    },
    {
      "action": "重置后, 再次点击「报告周期」筛选图标，勾选「一次性」，点击「确定」, 然后在「报告名称」中输入${name}并查询",
      "expected": "显示「报告周期」为「一次性」且「报告名称」为${name}的记录"
    }
  ]
} as const;

test.describe("验证「已配置报告」-报告周期筛选", () => {
  test("C0976 验证「已配置报告」-报告周期筛选", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
