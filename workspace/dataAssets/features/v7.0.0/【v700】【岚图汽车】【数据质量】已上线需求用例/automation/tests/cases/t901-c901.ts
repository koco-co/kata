// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C901",
  "title": "验证【数据质量 规则库配置 规则库-内置规则展示】规则库中「格式-json格式校验」内置规则展示信息正确",
  "steps": [
    {
      "action": "进入【数据质量 → 规则库配置】页面，等待内置规则列表加载完成",
      "expected": "规则库页面正常加载，内置规则列表展示完成"
    },
    {
      "action": "在「内置规则」列表的搜索框中输入「格式-json格式校验」，点击搜索",
      "expected": "搜索结果展示「格式-json格式校验」规则条目，各字段显示：\n1) 规则名称=「格式-json格式校验」\n2) 规则解释=「格式-json格式校验」\n3) 规则分类=「有效性校验」\n4) 关联范围=「字段」\n5) 规则描述=「校验json类型的字段中key对应的value值是否符合规范要求」"
    },
    {
      "action": "导出规则库",
      "expected": "存在格式校验-格式-json格式校验-有效性校验"
    }
  ]
} as const;

test.describe("验证【数据质量 规则库配置 规则库-内置规则展示】规则库中「格式-json格式校验」内置规则展示信息正确", () => {
  test("C901 验证【数据质量 规则库配置 规则库-内置规则展示】规则库中「格式-json格式校验」内置规则展示信息正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
