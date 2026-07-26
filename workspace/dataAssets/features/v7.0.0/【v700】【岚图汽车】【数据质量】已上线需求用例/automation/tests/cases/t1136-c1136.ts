// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1136",
  "title": "验证【数据质量 规则集管理 规则配置-key范围校验基础功能】key数据量超过200条时默认加载前200条及搜索功能",
  "steps": [
    {
      "action": "进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成",
      "expected": "规则集管理页面正常打开，列表加载完成"
    },
    {
      "action": "找到\"rule_set_key_range_test\"，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在\"key范围校验测试包\"中点击【新增规则】，统计函数选择\"key范围校验\"，字段选择\"info\"，点击校验内容下拉框，等待列表加载完成",
      "expected": "规则集编辑页正常打开，Step 2 监控规则页面加载完成，已有配置回显正确"
    },
    {
      "action": "滚动下拉列表到底部，观察可见的key条目总数",
      "expected": "下拉框中最多显示200条key数据（key_001至key_200），滚动到底部不再追加加载"
    },
    {
      "action": "在搜索框中输入\"key_201\"，等待搜索结果加载",
      "expected": "搜索结果正确返回\"key_201\"，不受前200条默认加载限制"
    }
  ]
} as const;

test.describe("验证【数据质量 规则集管理 规则配置-key范围校验基础功能】key数据量超过200条时默认加载前200条及搜索功能", () => {
  test("C1136 验证【数据质量 规则集管理 规则配置-key范围校验基础功能】key数据量超过200条时默认加载前200条及搜索功能", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
