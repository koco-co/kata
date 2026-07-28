// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0114",
  "title": "验证「完整性校验」-「多表数据行数对比」规则校验(无效分区)",
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
      "action": "配置「数据源」「数据库」「数据表」car_compare02等信息，选择【完整性校验】规则",
      "expected": "选择成功，展示【完整性校验】规则配置项"
    },
    {
      "action": "「校验类型」选择「多表数据行数对比」\n「选择对比表1所属库/对比表」选择car_compare02所在的库/表\n「输入分区」选择「手动输入分区」, 并输入不存在的分区「delivery_time=\"2025-01-01\"」\n「强弱规则」选择「弱规则」\n「规则描述」输入「测试规则」",
      "expected": "配置完成"
    },
    {
      "action": "点击「保存」按钮, 点击「下一步」，配置「周期任务」, 点击「完成」按钮",
      "expected": "规则保存成功"
    },
    {
      "action": "立即运行、周期运行",
      "expected": "1) 任务实例状态由「运行中」 > 「校验异常」\n2) 任务实例详情页面显示「校验失败」标识, 可支持查看日志\n3) 完整性检验表格中新增键值对: 规则类型-多表数据行数对比"
    },
    {
      "action": "点击「查看日志」",
      "expected": "展示校验失败原因"
    }
  ]
} as const;

test.describe("验证「完整性校验」-「多表数据行数对比」规则校验(无效分区)", () => {
  test("C0114 验证「完整性校验」-「多表数据行数对比」规则校验(无效分区)", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
