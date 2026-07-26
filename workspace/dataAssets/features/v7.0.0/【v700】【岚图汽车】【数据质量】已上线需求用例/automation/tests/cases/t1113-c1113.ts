// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1113",
  "title": "验证【数据质量 规则集管理 规则配置-选项UI】规则配置页「统计规则」下拉框中「格式-json格式校验」选项位置在自定义正则上方",
  "steps": [
    {
      "action": "进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成",
      "expected": "规则集管理页面正常打开，列表加载完成"
    },
    {
      "action": "找到规则集\"rule_set_value_fmt_ui\"，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在\"value格式校验UI测试包\"中点击【新增规则】，选择「有效性校验」，「字段」下拉框选择「info（json）」，展开「统计规则」下拉框，查看选项列表",
      "expected": "「统计规则」下拉框中出现「格式-json格式校验」选项，且该选项位于「自定义正则」选项的上方"
    }
  ]
} as const;

test.describe("验证【数据质量 规则集管理 规则配置-选项UI】规则配置页「统计规则」下拉框中「格式-json格式校验」选项位置在自定义正则上方", () => {
  test("C1113 验证【数据质量 规则集管理 规则配置-选项UI】规则配置页「统计规则」下拉框中「格式-json格式校验」选项位置在自定义正则上方", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
