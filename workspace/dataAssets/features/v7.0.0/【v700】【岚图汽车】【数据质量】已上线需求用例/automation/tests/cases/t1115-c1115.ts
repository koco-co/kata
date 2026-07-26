// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1115",
  "title": "验证【数据质量 规则集管理 表单校验】取值范围和枚举值均未填写时点击保存提示至少填写一项",
  "steps": [
    {
      "action": "进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成",
      "expected": "规则集管理页面正常打开，列表显示已有规则集数据行"
    },
    {
      "action": "找到\"ruleset_15695_and\"，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在\"且关系校验包\"中点击【新增规则】，在统计函数下拉框中选择【取值范围&枚举范围】",
      "expected": "规则集编辑页 Step 2 打开，新增规则配置区域展开，统计函数显示「取值范围&枚举范围」"
    },
    {
      "action": "在当前规则配置表单中按顺序填写如下：\n- *字段: score\n-*取值范围行: 期望值和操作符均不填写，保持为空\n- *枚举值行: 不填写，保持为空\n- 强弱规则: 强规则\n- 过滤条件: 无\n- 规则描述: 无",
      "expected": "*字段下拉框显示已选中 score，取值范围和枚举值均为空"
    },
    {
      "action": "点击【保存】按钮",
      "expected": "保存失败，页面展示红色校验错误提示「取值范围和枚举值至少填写一项」，规则未被保存"
    }
  ]
} as const;

test.describe("验证【数据质量 规则集管理 表单校验】取值范围和枚举值均未填写时点击保存提示至少填写一项", () => {
  test("C1115 验证【数据质量 规则集管理 表单校验】取值范围和枚举值均未填写时点击保存提示至少填写一项", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
