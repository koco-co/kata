// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0258",
  "title": "验证「完整性校验」-「表级-表行数检测」-「月度平均波动检测」-「校验异常」逻辑正确",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击「新建监控规则」按钮，进入监控规则配置页面",
      "expected": "「详情说明」 为「今日表行数为1，上月同天至昨日的平均表行数为10，表行数月度平均值波动率为xx，不符合规则\"月度平均值波动率>1%\"」"
    },
    {
      "action": "配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-\"exam_date=2024-03-15\"，选择【完整性校验】规则",
      "expected": "「操作栏」展示「查看详情」按钮，点击展示「明细数据」"
    },
    {
      "action": "「校验类型」选择「单表」\n「规则类型」选择「表级」\n「统计函数」 选择「表行数」\n「过滤条件」 输入「id < 100」\n「校验方法」选择「月度平均波动检测」\n「期望值」选择「<1%」\n「强弱规则」选择「弱规则」\n「规则描述」输入「测试规则」",
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
      "expected": "1. 「质检结果」为「校验未通过」，「未通过原因」展示为「表行数检测未通过」"
    }
  ]
} as const;

test.describe("验证「完整性校验」-「表级-表行数检测」-「月度平均波动检测」-「校验异常」逻辑正确", () => {
  test("C0258 验证「完整性校验」-「表级-表行数检测」-「月度平均波动检测」-「校验异常」逻辑正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
