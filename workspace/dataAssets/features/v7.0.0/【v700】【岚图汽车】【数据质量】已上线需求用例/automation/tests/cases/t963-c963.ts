// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C963",
  "title": "验证【「已配置报告」】「新建报告」-报告周期UI交互正确",
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
      "action": "点击「报告周期」下拉框",
      "expected": "支持选择天/月/周/自定义/一次性"
    },
    {
      "action": "「报告周期」选择「天」",
      "expected": "1) 额外支持「生效日期」和「具体时间」\n2) 「生效日期」精确到年-月-日, 范围: T~~T+100*365\n3) 「具体时间」精确到时-分, 范围: 00:00~~23:59\n4) 值更新为所选值「天」"
    },
    {
      "action": "「报告周期」选择「周」",
      "expected": "1) 额外支持「生效日期」、「选择时间」、「具体时间」2) 「生效日期」精确到年-月-日, 范围: T~~T+100*3653) 「选择时间」可选择星期一~~日4) 「具体时间」精确到时-分, 范围: 00:00~23:595) 值更新为所选值「周」"
    },
    {
      "action": "「报告周期」选择「月」",
      "expected": "1) 额外支持「生效日期」、「选择时间」、「具体时间」2) 「生效日期」精确到年-月-日, 范围: T~~T+100*3653) 「选择时间」可选择每月1号~~31号4) 「具体时间」精确到时-分, 范围: 00:00~23:595) 值更新为所选值「月」"
    },
    {
      "action": "「报告周期」选择「一次性」",
      "expected": "值更新为所选值「一次性」"
    },
    {
      "action": "「报告周期」选择「自定义调度」",
      "expected": "值更新为所选值「自定义调度」"
    }
  ]
} as const;

test.describe("验证【「已配置报告」】「新建报告」-报告周期UI交互正确", () => {
  test("C963 验证【「已配置报告」】「新建报告」-报告周期UI交互正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
