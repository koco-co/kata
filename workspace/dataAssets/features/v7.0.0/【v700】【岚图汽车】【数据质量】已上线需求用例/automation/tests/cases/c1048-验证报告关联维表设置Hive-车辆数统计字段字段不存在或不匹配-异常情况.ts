// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1048",
  "title": "验证【「报告关联维表设置Hive」-「车辆数统计字段」字段不存在或不匹配-异常情况】",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击「新建监控规则」按钮，进入监控规则配置页面",
      "expected": "表中包含总车辆不展示(日志内报错字段名不匹配或不存在)"
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
      "action": "【报告配置】如下：\n「报告名称」保持默认名称\n「报告类型」保持默认「质检式」\n「报告统计规则范围」默认选择「全部」\n「报告周期」选择「天」-「每天18点」\n「数据周期」选择「前1天～前3天」\n「结果展示」 选择「展示最新结果」\n「是否需要车辆信息」选择「是」",
      "expected": "报告配置成功"
    },
    {
      "action": "保存并立即运行规则",
      "expected": "任务实例运行完成"
    },
    {
      "action": "进入【数据质量报告】页面查看报告",
      "expected": "1. 报告上方展示车辆信息汇总模块"
    }
  ]
} as const;

test.describe("验证【「报告关联维表设置Hive」-「车辆数统计字段」字段不存在或不匹配-异常情况】", () => {
  test("C1048 验证【「报告关联维表设置Hive」-「车辆数统计字段」字段不存在或不匹配-异常情况】", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
