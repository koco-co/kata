// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1133",
  "title": "验证【数据质量 规则集管理 规则配置-key范围校验基础功能】校验内容标签旁悬浮提示文案正确",
  "steps": [
    {
      "action": "进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成",
      "expected": "规则集管理页面正常打开，列表加载完成"
    },
    {
      "action": "找到\"rule_set_key_range_test\"，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在\"key范围校验测试包\"中点击【新增规则】，统计函数选择\"key范围校验\"",
      "expected": "规则集编辑页正常打开，Step 2 监控规则页面加载完成，已有配置回显正确"
    },
    {
      "action": "将鼠标悬浮在\"校验内容\"标签旁的提示图标上，等待tooltip出现",
      "expected": "tooltip显示文案为\"校验内容key信息需要在通用配置模块维护。\"，文案完全匹配，无多余空格或乱码"
    }
  ]
} as const;

test.describe("验证【数据质量 规则集管理 规则配置-key范围校验基础功能】校验内容标签旁悬浮提示文案正确", () => {
  test("C1133 验证【数据质量 规则集管理 规则配置-key范围校验基础功能】校验内容标签旁悬浮提示文案正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
