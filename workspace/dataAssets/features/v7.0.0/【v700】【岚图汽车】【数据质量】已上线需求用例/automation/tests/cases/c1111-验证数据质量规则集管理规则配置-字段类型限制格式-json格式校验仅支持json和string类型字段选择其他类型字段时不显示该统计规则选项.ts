// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1111",
  "title": "验证【数据质量 规则集管理 规则配置-字段类型限制】「格式-json格式校验」仅支持json和string类型字段，选择其他类型字段时不显示该统计规则选项",
  "steps": [
    {
      "action": "进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成",
      "expected": "规则集管理页面正常打开，列表加载完成"
    },
    {
      "action": "找到规则集\"rule_set_field_type_test\"，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在\"字段类型测试包\"中点击【新增规则】，添加有效性校验规则，分别将「字段」依次选择为「age（int）」「salary（decimal）」「created_at（datetime）」，观察每次选择后「统计规则」下拉框的可选项",
      "expected": "选择 int、decimal、datetime 类型字段时，「统计规则」下拉框中均不出现「格式-json格式校验」选项"
    },
    {
      "action": "将「字段」切换选择为「info（json）」，展开「统计规则」下拉框查看选项",
      "expected": "选择 json 类型字段后，「统计规则」下拉框中出现「格式-json格式校验」选项"
    },
    {
      "action": "将「字段」切换选择为「name（varchar）」，展开「统计规则」下拉框查看选项",
      "expected": "选择 varchar 类型字段后，「统计规则」下拉框中同样出现「格式-json格式校验」选项"
    }
  ]
} as const;

test.describe("验证【数据质量 规则集管理 规则配置-字段类型限制】「格式-json格式校验」仅支持json和string类型字段，选择其他类型字段时不显示该统计规则选项", () => {
  test("C1111 验证【数据质量 规则集管理 规则配置-字段类型限制】「格式-json格式校验」仅支持json和string类型字段，选择其他类型字段时不显示该统计规则选项", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
