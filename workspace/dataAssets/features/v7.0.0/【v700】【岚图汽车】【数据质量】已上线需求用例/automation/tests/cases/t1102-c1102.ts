// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1102",
  "title": "验证【数据质量 规则集管理 规则配置】未选择校验key时保存规则提示「请选择校验key」",
  "steps": [
    {
      "action": "进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成",
      "expected": "规则集管理页面正常打开，列表加载完成"
    },
    {
      "action": "找到规则集\"rule_set_required_test\"，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在\"必填校验测试包\"中点击【新增规则】，选择「有效性校验」，按如下配置：\n- *字段：info（json）\n-*统计规则：格式-json格式校验\n- *校验key：不选择任何key\n直接点击【保存】按钮",
      "expected": "保存失败；「校验key」输入框下方显示错误提示「请选择校验key」；规则未被添加到列表"
    }
  ]
} as const;

test.describe("验证【数据质量 规则集管理 规则配置】未选择校验key时保存规则提示「请选择校验key」", () => {
  test("C1102 验证【数据质量 规则集管理 规则配置】未选择校验key时保存规则提示「请选择校验key」", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
