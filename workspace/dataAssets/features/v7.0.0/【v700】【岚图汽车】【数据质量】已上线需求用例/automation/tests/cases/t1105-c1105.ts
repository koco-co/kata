// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1105",
  "title": "验证【数据质量 规则集管理 规则配置-校验key选择】校验key输入框悬浮时展示全部key名，默认仅显示前两个",
  "steps": [
    {
      "action": "进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成",
      "expected": "规则集管理页面正常打开，列表加载完成"
    },
    {
      "action": "找到规则集\"rule_set_hover_test\"，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，查看\"悬浮展示测试包\"中已配置的「格式-json格式校验」规则行的\"校验key\"列",
      "expected": "规则集编辑页正常打开，Step 2 监控规则页面加载完成，已配置的「格式-json格式校验」规则行展示校验key为「field-key1;field-key2;field-key3;field-key4」"
    },
    {
      "action": "观察\"校验key\"列在非悬浮状态下的显示内容",
      "expected": "「校验key」字段区域默认仅展示前两个key「field-key1」和「field-key2」，后续key以省略符截断"
    },
    {
      "action": "将鼠标悬浮在「校验key」字段区域",
      "expected": "浮层展示全部4个key名：「field-key1」「field-key2」「field-key3」「field-key4」"
    }
  ]
} as const;

test.describe("验证【数据质量 规则集管理 规则配置-校验key选择】校验key输入框悬浮时展示全部key名，默认仅显示前两个", () => {
  test("C1105 验证【数据质量 规则集管理 规则配置-校验key选择】校验key输入框悬浮时展示全部key名，默认仅显示前两个", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
