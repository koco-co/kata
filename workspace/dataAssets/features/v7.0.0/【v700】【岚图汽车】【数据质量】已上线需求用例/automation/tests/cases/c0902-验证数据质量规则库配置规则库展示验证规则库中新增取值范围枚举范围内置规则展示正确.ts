// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0902",
  "title": "验证【数据质量 规则库配置 规则库展示】 验证规则库中新增取值范围&枚举范围内置规则展示正确",
  "steps": [
    {
      "action": "进入【数据质量 → 规则库配置】页面，等待规则库配置列表加载完成",
      "expected": "规则库配置页面打开，列表显示规则数据"
    },
    {
      "action": "点击页面顶部【内置规则】Tab 页签，在规则分类筛选下拉框中勾选【有效性校验】，点击【确定】按钮，等待列表刷新完成",
      "expected": "列表按有效性校验分类筛选刷新完成，仅显示规则分类为「有效性校验」的规则条目"
    },
    {
      "action": "在规则列表中查找规则名称为【取值范围&枚举范围】的规则条目，查看该行各列内容",
      "expected": "规则库列表中存在规则名称为【取值范围&枚举范围】的条目，各列显示如下：\n1) 规则解释列显示「取值范围和枚举范围的联合校验」\n2) 规则分类列显示「有效性校验」\n3) 关联范围列显示「字段」\n4) 规则描述列显示「校验字段值取值范围和枚举范围是否符合要求，支持配置规则且或关系」"
    },
    {
      "action": "导出规则库",
      "expected": "存在取值范围&枚举范围-取值范围和枚举范围的联合校验-有效性校验"
    }
  ]
} as const;

test.describe("验证【数据质量 规则库配置 规则库展示】 验证规则库中新增取值范围&枚举范围内置规则展示正确", () => {
  test("C0902 验证【数据质量 规则库配置 规则库展示】 验证规则库中新增取值范围&枚举范围内置规则展示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
