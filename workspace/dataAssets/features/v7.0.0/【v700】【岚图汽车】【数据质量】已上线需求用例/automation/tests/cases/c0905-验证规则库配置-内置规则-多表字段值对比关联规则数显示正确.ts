// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0905",
  "title": "验证「规则库配置」-「内置规则」-「多表字段值对比」关联规则数显示正确",
  "steps": [
    {
      "action": "进入「资产-数据质量-规则库配置」页面",
      "expected": "页面正常打开"
    },
    {
      "action": "找到「多表字段值对比」规则，查看「关联规则数」列",
      "expected": "默认为0"
    },
    {
      "action": "切换至「资产-数据质量-规则集管理-新增规则集」页面，添加「合理性校验-多表字段值对比」规则",
      "expected": "保存成功"
    },
    {
      "action": "切换至「资产-数据质量-规则库配置」页面",
      "expected": "页面正常打开"
    },
    {
      "action": "找到「多表字段值对比」规则，查看「关联规则数」列和「规则状态」列",
      "expected": "「关联规则数」显示为1，「规则状态」开关置灰，不可更改"
    },
    {
      "action": "删除「规则集管理」-「合理性校验」-「多表字段值对比」规则",
      "expected": "删除成功"
    },
    {
      "action": "查看「规则库配置」-「合理性校验」-「多表字段值对比」",
      "expected": "「关联规则数」显示为0，「规则状态」开关可更改"
    }
  ]
} as const;

test.describe("验证「规则库配置」-「内置规则」-「多表字段值对比」关联规则数显示正确", () => {
  test("C0905 验证「规则库配置」-「内置规则」-「多表字段值对比」关联规则数显示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
