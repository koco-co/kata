// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C008",
  "title": "验证重复内置规则隐藏",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则库配置】页面",
      "expected": "进入成功"
    },
    {
      "action": "检查内置规则列表",
      "expected": "1) 规则分类为「有效性校验」，规则名称为「重复值检测」、「null值检测」的规则隐藏，不做展示2) 规则状态默认为关闭状态"
    },
    {
      "action": "进入【规则集管理】, 新建规则集-监控规则配置页面, 添加「有效性校验」规则",
      "expected": "添加成功"
    },
    {
      "action": "检查有效性校验块的配置项",
      "expected": "不再支持选择重复值检测、NULL值检测的规则"
    }
  ]
} as const;

test.describe("验证重复内置规则隐藏", () => {
  test("C008 验证重复内置规则隐藏", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
