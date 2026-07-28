// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0923",
  "title": "验证「报告配置」-「数据周期」选择框功能校验",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "输入101天前",
      "expected": "数据周期支持选择xx天前～xx天前，后面的数值需要小于前面的数值，最大支持100"
    },
    {
      "action": "前后输入同样的数值",
      "expected": "提示前后不能输入同样的数值"
    },
    {
      "action": "前面输入1，后面输入5",
      "expected": "提示后面的值不能大于前面的值"
    },
    {
      "action": "前面输入5，后面输入1",
      "expected": "配置成功"
    },
    {
      "action": "「报告周期」选择「月」",
      "expected": "1. 「数据周期」可选择「每月x号~每月x号」"
    },
    {
      "action": "1. 「报告周期」选择「天」",
      "expected": "1. 「数据周期」可选择「xx天前～xx天前」"
    },
    {
      "action": "「报告周期」选择「周」",
      "expected": "1. 「数据周期」可选择「每周x ~ 每周x」"
    },
    {
      "action": "「报告周期」选择「自定义」",
      "expected": "1. 「数据周期」可选择「xx天前～xx天前」"
    }
  ]
} as const;

test.describe("验证「报告配置」-「数据周期」选择框功能校验", () => {
  test("C0923 验证「报告配置」-「数据周期」选择框功能校验", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
