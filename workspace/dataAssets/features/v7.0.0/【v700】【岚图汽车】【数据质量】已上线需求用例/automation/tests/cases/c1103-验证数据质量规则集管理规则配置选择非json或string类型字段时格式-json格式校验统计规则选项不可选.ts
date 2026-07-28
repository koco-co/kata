// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1103",
  "title": "验证【数据质量 规则集管理 规则配置】选择非json或string类型字段时「格式-json格式校验」统计规则选项不可选",
  "steps": [
    {
      "action": "进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成",
      "expected": "规则集管理页面正常打开，列表加载完成"
    },
    {
      "action": "找到规则集\"rule_set_int_type_test\"，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在\"int类型限制测试包\"中点击【新增规则】，选择「有效性校验」，「字段」下拉框选择「count_val（int）」，展开「统计规则」下拉框",
      "expected": "「统计规则」下拉框中不出现「格式-json格式校验」选项"
    }
  ]
} as const;

test.describe("验证【数据质量 规则集管理 规则配置】选择非json或string类型字段时「格式-json格式校验」统计规则选项不可选", () => {
  test("C1103 验证【数据质量 规则集管理 规则配置】选择非json或string类型字段时「格式-json格式校验」统计规则选项不可选", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
