// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0281",
  "title": "验证自定义正则内容支持在规则详情页面查看",
  "steps": [
    {
      "action": "进入「资产」-「数据质量」-「规则任务管理」页面",
      "expected": "进入成功"
    },
    {
      "action": "选择规则A，点击规则名查看规则详情",
      "expected": "「校验类型」后新增「？」标识"
    },
    {
      "action": "选择规则A，点击规则名查看规则详情",
      "expected": "「校验类型」后新增「？」标识"
    },
    {
      "action": "鼠标hover「？」标识处",
      "expected": "提示具体正则内容\"^[1-9]\\\\d*$\""
    },
    {
      "action": "编辑规则，重新选择自定义正则rule2",
      "expected": "保存"
    },
    {
      "action": "选择规则A，点击规则名查看规则详情",
      "expected": "提示具体正则内容\"^\\\\d*$\""
    },
    {
      "action": "编辑自定义正则rule2，修改内容为「test」,保存",
      "expected": "修改自定义正则成功"
    },
    {
      "action": "选择规则A，点击规则名查看规则详情",
      "expected": "提示具体正则内容\"^\\\\d*$\""
    },
    {
      "action": "重新编辑保存规则A后，查看规则详情",
      "expected": "提示具体正则内容\"test\""
    }
  ]
} as const;

test.describe("验证自定义正则内容支持在规则详情页面查看", () => {
  test("C0281 验证自定义正则内容支持在规则详情页面查看", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
