// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1126",
  "title": "验证【数据质量 规则集管理 规则配置参数展示】规则配置参数卡片完整展示所有字段",
  "steps": [
    {
      "action": "进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成",
      "expected": "规则集管理页面正常打开，列表加载完成"
    },
    {
      "action": "找到\"rule_set_key_range_test\"，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面",
      "expected": "规则集编辑页正常打开，Step 2 监控规则页面加载完成，已有配置回显正确"
    },
    {
      "action": "找到\"key范围校验测试包\"中已配置的key范围校验规则，点击规则行展开查看参数详情卡片，逐项核对各参数字段",
      "expected": "规则配置参数卡片完整展示以下所有字段且内容正确：\n1) 规则类型=字段级\n2) 字段=info\n3) 统计函数=key范围校验\n4) 过滤条件=id > 0\n5) 校验方法=包含\n6) 校验内容=key1-key2;key11-key22\n7) 强弱规则=强规则\n8) 规则描述=测试key范围校验规则"
    }
  ]
} as const;

test.describe("验证【数据质量 规则集管理 规则配置参数展示】规则配置参数卡片完整展示所有字段", () => {
  test("C1126 验证【数据质量 规则集管理 规则配置参数展示】规则配置参数卡片完整展示所有字段", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
