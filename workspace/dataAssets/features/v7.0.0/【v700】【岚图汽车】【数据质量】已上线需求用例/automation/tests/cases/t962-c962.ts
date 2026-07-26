// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C962",
  "title": "验证【「已配置报告」】「新建报告」-数据周期UI交互正确",
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
      "action": "「报告周期」选择「天」, 展开「数据周期」下拉框",
      "expected": "支持选择到100天前~1天前"
    },
    {
      "action": "「报告周期」选择「周」, 展开「数据周期」下拉框",
      "expected": "支持选择到每周一~每周日"
    },
    {
      "action": "「报告周期」选择「月」, 展开「数据周期」下拉框",
      "expected": "支持选择到每月1号~每月31号, 选择31号时，如果没有31号则统计到30号/28号截止"
    },
    {
      "action": "「报告周期」选择「一次性」, 展开「数据周期」下拉框",
      "expected": "1) 支持选择到当天日期的一年前~当前日期\n2) 超过的时间部分置灰, 无法选中"
    },
    {
      "action": "「报告周期」选择「自定义调度」, 展开「数据周期」下拉框",
      "expected": "支持选择到「控制台-全局配置-自定义调度日期」中配置的自定义调度日期名称"
    }
  ]
} as const;

test.describe("验证【「已配置报告」】「新建报告」-数据周期UI交互正确", () => {
  test("C962 验证【「已配置报告」】「新建报告」-数据周期UI交互正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
