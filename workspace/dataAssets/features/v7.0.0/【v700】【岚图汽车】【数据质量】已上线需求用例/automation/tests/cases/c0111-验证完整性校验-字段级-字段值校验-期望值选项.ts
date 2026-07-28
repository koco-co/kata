// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0111",
  "title": "验证【「完整性校验」-「字段级」-「字段值校验」-「期望值」选项】",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击「新建监控规则」按钮，进入监控规则配置页面",
      "expected": "进入成功"
    },
    {
      "action": "配置「数据源」「数据库」「数据表」，选择【完整性校验】规则",
      "expected": "选择成功，展示【完整性校验】规则配置项"
    },
    {
      "action": "「规则类型」选择「字段级」\n「字段」选择「XX 字段」\n「字段间规则逻辑」选择「and」\n「统计函数」选择「字段值校验」",
      "expected": "选择成功"
    },
    {
      "action": "查看「期望值」选项",
      "expected": "支持选择「=/>/>=/</<=/!=/in/not in/包含/不包含」"
    }
  ]
} as const;

test.describe("验证【「完整性校验」-「字段级」-「字段值校验」-「期望值」选项】", () => {
  test("C0111 验证【「完整性校验」-「字段级」-「字段值校验」-「期望值」选项】", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
