// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1137",
  "title": "验证【数据质量 规则集管理 规则配置-key范围校验基础功能】校验内容下拉框支持输入关键词搜索查询",
  "steps": [
    {
      "action": "进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成",
      "expected": "规则集管理页面正常打开，列表加载完成"
    },
    {
      "action": "找到\"rule_set_key_range_test\"，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在\"key范围校验测试包\"中点击【新增规则】，统计函数选择\"key范围校验\"，字段选择\"info\"，点击校验内容下拉框，等待下拉列表加载完成",
      "expected": "规则集编辑页正常打开，Step 2 监控规则页面加载完成，已有配置回显正确"
    },
    {
      "action": "在校验内容下拉框内的搜索输入框中输入\"key1\"",
      "expected": "下拉列表过滤显示包含\"key1\"的结果：key1（姓名）、key11（省份），其余key不显示"
    },
    {
      "action": "清空搜索框内容，输入\"省份\"",
      "expected": "下拉列表过滤显示包含\"省份\"的结果：key11（省份），其余key不显示"
    },
    {
      "action": "清空搜索框内容，输入\"xyz_not_exist\"",
      "expected": "下拉列表显示\"暂无数据\"，不显示任何key选项"
    }
  ]
} as const;

test.describe("验证【数据质量 规则集管理 规则配置-key范围校验基础功能】校验内容下拉框支持输入关键词搜索查询", () => {
  test("C1137 验证【数据质量 规则集管理 规则配置-key范围校验基础功能】校验内容下拉框支持输入关键词搜索查询", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
