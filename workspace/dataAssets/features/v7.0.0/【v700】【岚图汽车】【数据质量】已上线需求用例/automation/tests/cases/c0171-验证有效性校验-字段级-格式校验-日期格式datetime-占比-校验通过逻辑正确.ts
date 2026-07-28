// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0171",
  "title": "验证「有效性校验」-「字段级-格式校验-日期格式datetime」-「占比」-「校验通过」逻辑正确",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击「新建监控规则」按钮，进入监控规则配置页面",
      "expected": "「详情说明」 为「字段符合格式数量为xx，符合规则\"固定值xx\"」"
    },
    {
      "action": "配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-\"exam_date=2024-03-15\"，选择【有效性校验】规则",
      "expected": "「操作栏」不展示按钮"
    },
    {
      "action": "「字段」选择「id」\n「统计规则」 选择「格式校验-日期格式datetime」\n「校验格式」选择「占比」\n「期望值」 <10%\n「过滤条件」 输入「id < 100」\n「强弱规则」选择「弱规则」\n「规则描述」输入「测试规则」",
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
    },
    {
      "action": "进入【数据质量报告】页面，选择表tableA，查看「规则校验明细」",
      "expected": "1. 「质检结果」为「校验通过」，「未通过原因」不展示"
    }
  ]
} as const;

test.describe("验证「有效性校验」-「字段级-格式校验-日期格式datetime」-「占比」-「校验通过」逻辑正确", () => {
  test("C0171 验证「有效性校验」-「字段级-格式校验-日期格式datetime」-「占比」-「校验通过」逻辑正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
