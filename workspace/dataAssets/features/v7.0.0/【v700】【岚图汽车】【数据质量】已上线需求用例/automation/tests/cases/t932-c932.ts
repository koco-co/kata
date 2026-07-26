// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C932",
  "title": "验证「报告详情」-页面&功能正常(Doris 2.x)",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【数据质量报告】页面",
      "expected": "成功进入「已配置报告」页面"
    },
    {
      "action": "点击「已生成报告」页签, 选择校验成功的报告记录, 点击「报告详情」按钮",
      "expected": "跳转到【数据质量报告】详情页面"
    },
    {
      "action": "UI CHECK",
      "expected": "显示一份质量评估汇总表格:\n质量评估汇总(car_compare01--delivery_time=2025-09-19)"
    },
    {
      "action": "点击质量评估汇总（car_compare01\n-delivery_time）中的「车型」筛选图标",
      "expected": "1) 支持选择car_config字段的所有枚举\n2) 按钮: 重置/确定, 重置默认置灰"
    },
    {
      "action": "勾选「H53a」 , 点击「确定」",
      "expected": "显示「车型」为「H53a」的记录"
    },
    {
      "action": "重置后, 再次点击「车型」筛选图标，勾选「H53a」和「H53b」 , 点击「确定」",
      "expected": "显示「车型」为「H53a」或「H53b」的记录"
    }
  ]
} as const;

test.describe("验证「报告详情」-页面&功能正常(Doris 2.x)", () => {
  test("C932 验证「报告详情」-页面&功能正常(Doris 2.x)", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
