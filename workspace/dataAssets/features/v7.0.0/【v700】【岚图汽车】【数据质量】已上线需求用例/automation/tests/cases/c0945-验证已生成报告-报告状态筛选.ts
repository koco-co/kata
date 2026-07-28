// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0945",
  "title": "验证「已生成报告」-报告状态筛选",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【数据质量报告】页面",
      "expected": "成功进入「已配置报告」页面"
    },
    {
      "action": "点击「已生成报告」页签",
      "expected": "成功切换到「已生成报告」"
    },
    {
      "action": "点击表头「报告状态」的筛选图标",
      "expected": "1) 支持选择待生成/生成中/已生成/生成成功，支持多选\n2) 按钮: 重置/确定, 重置默认置灰"
    },
    {
      "action": "勾选「已生成」，点击「确定」",
      "expected": "显示「规则范围」为「已生成」的记录"
    },
    {
      "action": "重置后, 再次点击「报告状态」筛选图标，勾选「待生成」「已生成」，点击「确定」",
      "expected": "显示「规则范围」为「待生成」和「已生成」的记录"
    },
    {
      "action": "重置后, 再次点击「规则范围」筛选图标，勾选「已生成」，点击「确定」, 然后在「报告名称」中输入${name}并查询",
      "expected": "显示「规则范围」为「已生成」且「报告名称」为${name}的记录"
    }
  ]
} as const;

test.describe("验证「已生成报告」-报告状态筛选", () => {
  test("C0945 验证「已生成报告」-报告状态筛选", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
