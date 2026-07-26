// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C512",
  "title": "验证新增「合理性校验」类型",
  "steps": [
    {
      "action": "进入「数据质量」-「规则任务管理」-「监控对象」页面",
      "expected": "进入成功"
    },
    {
      "action": "「规则名称」输入「test_rule」，「选择数据源」选择「${DATASOURCE}」，「选择数据库」选择「${DATABASE}」，「选择数据表」选择「${TABLE}」",
      "expected": "监控对象配置成功"
    },
    {
      "action": "查看右侧「添加规则」",
      "expected": "新增「合理性校验」"
    }
  ]
} as const;

test.describe("验证新增「合理性校验」类型", () => {
  test("C512 验证新增「合理性校验」类型", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
