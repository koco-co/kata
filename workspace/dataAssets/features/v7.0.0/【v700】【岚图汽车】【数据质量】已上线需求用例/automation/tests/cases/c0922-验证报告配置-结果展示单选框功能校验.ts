// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0922",
  "title": "验证「报告配置」-「结果展示单选框」功能校验",
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
      "action": "【完整性校验】规则均配置",
      "expected": "配置完成"
    },
    {
      "action": "点击「下一步」",
      "expected": "进入【调度配置】页面"
    },
    {
      "action": "查看「报告配置」-「数据周期」下「结果展示单选框」",
      "expected": "支持单项选择「展示最新结果」「展示全部结果」"
    }
  ]
} as const;

test.describe("验证「报告配置」-「结果展示单选框」功能校验", () => {
  test("C0922 验证「报告配置」-「结果展示单选框」功能校验", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
