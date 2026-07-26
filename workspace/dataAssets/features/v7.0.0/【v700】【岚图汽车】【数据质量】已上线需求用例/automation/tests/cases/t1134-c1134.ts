// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1134",
  "title": "验证【数据质量 规则集管理 规则配置-key范围校验基础功能】校验内容悬浮展示：默认显示前两个key悬浮展示全部",
  "steps": [
    {
      "action": "进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成",
      "expected": "规则集管理页面正常打开，列表加载完成"
    },
    {
      "action": "找到\"rule_set_key_range_test\"，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，查看\"key范围校验测试包\"中已配置的key范围校验规则行的\"校验内容\"列",
      "expected": "规则集编辑页正常打开，Step 2 监控规则页面加载完成，已有配置回显正确"
    },
    {
      "action": "观察\"校验内容\"列在非悬浮状态下的显示内容",
      "expected": "校验内容列默认仅展示前两个key信息（如\"key1-key2...\"），超出部分以省略号截断显示"
    },
    {
      "action": "将鼠标悬浮在\"校验内容\"列的文本上，等待tooltip出现",
      "expected": "鼠标悬浮后，tooltip中完整展示全部4个key信息：\"key1-key2;key11-key22\""
    }
  ]
} as const;

test.describe("验证【数据质量 规则集管理 规则配置-key范围校验基础功能】校验内容悬浮展示：默认显示前两个key悬浮展示全部", () => {
  test("C1134 验证【数据质量 规则集管理 规则配置-key范围校验基础功能】校验内容悬浮展示：默认显示前两个key悬浮展示全部", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
