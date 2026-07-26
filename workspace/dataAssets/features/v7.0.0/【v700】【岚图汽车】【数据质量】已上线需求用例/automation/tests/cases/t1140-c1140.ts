// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1140",
  "title": "验证【数据质量 规则集管理 规则配置-key范围校验基础功能】统计函数选择key范围校验后字段选择变为单选",
  "steps": [
    {
      "action": "进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成",
      "expected": "规则集管理页面正常打开，列表加载完成"
    },
    {
      "action": "找到规则集\"rule_set_key_range_test\"，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面",
      "expected": "规则集编辑页正常打开，Step 2 监控规则页面加载完成，已有配置回显正确"
    },
    {
      "action": "在规则包\"key范围校验测试包\"中点击【新增规则】，先在统计函数下拉列表中选择一个普通统计函数\"非空值数\"，在字段选择框中同时勾选\"info\"和\"extra_info\"两个字段",
      "expected": "字段选择框支持多选，可同时勾选多个字段"
    },
    {
      "action": "将统计函数切换为\"key范围校验\"，观察字段选择框的变化及统计函数标签旁的悬浮提示图标",
      "expected": "1) 切换为key范围校验后，统计函数标签旁出现悬浮提示图标，鼠标悬浮显示文案\"当选择key范围校验时，字段仅支持单选\"\n2) 字段选择框变为单选模式，原多选值自动清空"
    },
    {
      "action": "在字段选择框中先选择\"info\"，再选择\"extra_info\"",
      "expected": "字段选择框只允许选择一个字段，选择\"extra_info\"后\"info\"自动取消，最终只有\"extra_info\"一个字段被选中"
    }
  ]
} as const;

test.describe("验证【数据质量 规则集管理 规则配置-key范围校验基础功能】统计函数选择key范围校验后字段选择变为单选", () => {
  test("C1140 验证【数据质量 规则集管理 规则配置-key范围校验基础功能】统计函数选择key范围校验后字段选择变为单选", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
