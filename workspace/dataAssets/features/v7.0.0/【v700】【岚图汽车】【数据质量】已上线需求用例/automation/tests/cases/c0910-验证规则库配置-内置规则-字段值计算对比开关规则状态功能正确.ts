// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0910",
  "title": "验证「规则库配置」-「内置规则」-「字段值计算对比」开/关规则状态功能正确",
  "steps": [
    {
      "action": "进入「资产-数据质量-规则库配置」页面",
      "expected": "页面正常打开"
    },
    {
      "action": "找到「字段值计算对比」规则，查看「规则状态」列",
      "expected": "默认开启的状态"
    },
    {
      "action": "切换至「资产-数据质量-规则集管理-新增规则集-监控规则」页面，添加「合理性校验」规则",
      "expected": "添加成功"
    },
    {
      "action": "查看「合理性校验」-「统计函数」下拉项",
      "expected": "显示「字段值计算对比」项"
    },
    {
      "action": "切换至「资产-数据质量-规则库配置」页面",
      "expected": "页面正常打开"
    },
    {
      "action": "找到「字段值计算对比」规则，修改「规则状态」为关闭状态",
      "expected": "修改成功"
    },
    {
      "action": "切换至「资产-数据质量-规则集管理-新增规则集-监控规则」页面，添加「合理性校验」规则",
      "expected": "添加成功"
    },
    {
      "action": "查看「合理性校验」-「统计函数」下拉项",
      "expected": "不显示「字段值计算对比」项"
    }
  ]
} as const;

test.describe("验证「规则库配置」-「内置规则」-「字段值计算对比」开/关规则状态功能正确", () => {
  test("C0910 验证「规则库配置」-「内置规则」-「字段值计算对比」开/关规则状态功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
