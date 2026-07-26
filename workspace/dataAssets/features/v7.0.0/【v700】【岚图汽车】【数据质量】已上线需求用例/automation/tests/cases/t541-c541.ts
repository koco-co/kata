// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C541",
  "title": "验证【数据质量 规则任务管理 大数据量与层级校验】千级key数据量下校验内容选择列表的加载搜索和选择性能",
  "steps": [
    {
      "action": "进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成",
      "expected": "规则集管理页面正常打开，列表加载完成"
    },
    {
      "action": "找到\"rule_set_large_key_perf\"，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在\"大数据量性能测试包\"中点击【新增规则】，统计函数选择\"key范围校验\"，字段选择\"info\"，点击校验内容下拉框，等待列表加载完成",
      "expected": "校验内容下拉列表在3秒内加载完成，默认展示前200条key数据，页面无卡顿"
    },
    {
      "action": "在搜索框中输入\"key_l2_999\"，等待搜索结果返回",
      "expected": "搜索结果在2秒内返回，正确显示\"key_l2_999\"，搜索响应无明显延迟"
    },
    {
      "action": "勾选搜索到的\"key_l2_999\"，清空搜索框，再搜索并勾选\"key_l1_500\"，点击【确认】",
      "expected": "两个key均成功选中，校验内容回显\"key_l1_500;key_l2_999\"，选择操作流畅无卡顿"
    }
  ]
} as const;

test.describe("验证【数据质量 规则任务管理 大数据量与层级校验】千级key数据量下校验内容选择列表的加载搜索和选择性能", () => {
  test("C541 验证【数据质量 规则任务管理 大数据量与层级校验】千级key数据量下校验内容选择列表的加载搜索和选择性能", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
