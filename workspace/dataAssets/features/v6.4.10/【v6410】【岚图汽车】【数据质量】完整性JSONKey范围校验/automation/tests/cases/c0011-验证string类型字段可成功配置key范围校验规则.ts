// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0011",
  "title": "验证string类型字段可成功配置key范围校验规则",
  "steps": [
    {
      "action": "进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成",
      "expected": "规则集管理页面正常打开，列表加载完成"
    },
    {
      "action": "找到\"rule_set_field_type_test\"，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在\"字段类型测试包\"中点击【新增规则】，统计函数选择\"key范围校验\"，展开字段选择列表",
      "expected": "字段下拉列表中string类型字段\"extra_info\"可正常选择（不置灰）"
    },
    {
      "action": "在字段下拉框中选择\"extra_info\"（string类型），在规则配置表单中按顺序配置如下：\n- *校验方法: 包含\n- *校验内容: key1（姓名）\n- 强弱规则: 强规则\n- 规则描述: 无\n点击【保存】按钮",
      "expected": "保存成功，规则配置参数展示区显示字段=extra_info提示"
    },
    {
      "action": "使用 Doris3.x 数据源重复以上步骤，验证结果一致",
      "expected": "使用 Doris3.x 数据源执行后结果与 SparkThrift2.x 数据源一致"
    }
  ]
} as const;

test.describe("验证string类型字段可成功配置key范围校验规则", () => {
  test("C0011 验证string类型字段可成功配置key范围校验规则", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
