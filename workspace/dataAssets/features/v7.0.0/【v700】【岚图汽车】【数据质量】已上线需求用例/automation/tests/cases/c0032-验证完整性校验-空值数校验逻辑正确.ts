// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0032",
  "title": "验证「完整性校验」-「空值数」校验逻辑正确",
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
      "action": "配置「数据源」「数据库」「数据表」等信息，选择【完整性校验】规则",
      "expected": "选择成功，展示【完整性校验】规则配置项"
    },
    {
      "action": "「校验类型」选择「单表」\n「字段」选择「id」\n「统计函数」 选择「空值数」\n「过滤条件」 输入「id < 100」\n「校验方法」选择「固定值」\n「期望值」选择「<=0」\n「强弱规则」选择「弱规则」\n「规则描述」输入「测试规则」",
      "expected": "配置完成"
    },
    {
      "action": "点击「保存」按钮",
      "expected": "规则配置保存正确"
    },
    {
      "action": "点击「下一步」，配置「周期任务」",
      "expected": "周期调度配置完成"
    },
    {
      "action": "点击「完成」按钮",
      "expected": "规则保存成功"
    },
    {
      "action": "立即运行、周期运行",
      "expected": "实例运行成功"
    }
  ]
} as const;

test.describe("验证「完整性校验」-「空值数」校验逻辑正确", () => {
  test("C0032 验证「完整性校验」-「空值数」校验逻辑正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
