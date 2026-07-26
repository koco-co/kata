// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C013",
  "title": "验证未选择字段时保存key范围校验规则提示必填",
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
      "action": "不选择任何字段，校验方法选择\"包含\"，校验内容勾选\"key1（姓名）\"，直接点击【保存】",
      "expected": "保存失败，字段选择框下方显示红色错误提示\"请选择字段\"，页面不跳转，规则未被保存"
    },
    {
      "action": "使用 Doris3.x 数据源重复以上步骤，验证结果一致",
      "expected": "使用 Doris3.x 数据源执行后结果与 SparkThrift2.x 数据源一致"
    }
  ]
} as const;

test.describe("验证未选择字段时保存key范围校验规则提示必填", () => {
  test("C013 验证未选择字段时保存key范围校验规则提示必填", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
