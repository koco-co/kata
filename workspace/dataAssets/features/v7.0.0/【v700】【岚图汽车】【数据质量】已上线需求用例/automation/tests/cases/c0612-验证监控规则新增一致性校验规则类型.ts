// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0612",
  "title": "验证「监控规则」新增「一致性校验」规则类型",
  "steps": [
    {
      "action": "进入「资产-【数据资产】-【数据质量】-【规则任务管理】-监控对象」页面",
      "expected": "页面正常打开"
    },
    {
      "action": "「规则名称」输入「test_rule」\n「选择数据源」选择「${DATASOURCE}」\n「选择数据库」选择「${DATABASE}」\n「选择数据表」选择「${TABLE}」",
      "expected": "监控对象配置成功；\n进入「监控规则」配置页"
    },
    {
      "action": "点击【添加规则】按钮",
      "expected": "新增「一致性校验」规则"
    },
    {
      "action": "选择「一致性校验」规则",
      "expected": "选择成功，页面显示「一致性校验」规则配置区域"
    }
  ]
} as const;

test.describe("验证「监控规则」新增「一致性校验」规则类型", () => {
  test("C0612 验证「监控规则」新增「一致性校验」规则类型", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
