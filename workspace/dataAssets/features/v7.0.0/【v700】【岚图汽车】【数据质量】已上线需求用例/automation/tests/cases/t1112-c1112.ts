// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1112",
  "title": "验证【数据质量 规则集管理 规则配置-选项UI】「格式-json格式校验」统计规则悬浮提示内容正确",
  "steps": [
    {
      "action": "进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成",
      "expected": "规则集管理页面正常打开，列表加载完成"
    },
    {
      "action": "找到规则集\"rule_set_value_fmt_tip\"，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在\"提示测试包\"中点击【新增规则】，选择「有效性校验」，「字段」下拉框选择「info（json）」，「统计规则」下拉框选择「格式-json格式校验」，将鼠标悬浮在「格式-json格式校验」选项或其旁边的提示图标上",
      "expected": "悬浮提示内容显示为：「校验内容为key名对应的value格式是否符合要求，value格式需要在通用配置模块维护。」"
    }
  ]
} as const;

test.describe("验证【数据质量 规则集管理 规则配置-选项UI】「格式-json格式校验」统计规则悬浮提示内容正确", () => {
  test("C1112 验证【数据质量 规则集管理 规则配置-选项UI】「格式-json格式校验」统计规则悬浮提示内容正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
