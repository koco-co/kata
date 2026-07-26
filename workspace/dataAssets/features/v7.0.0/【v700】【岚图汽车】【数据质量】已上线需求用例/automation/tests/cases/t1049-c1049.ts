// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1049",
  "title": "验证「报告关联维表设置Hive」配置更新生效校验",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【通用配置】页面",
      "expected": "进入成功"
    },
    {
      "action": "选择「报告关联维表设置Hive」",
      "expected": "车系/车型/动力类型/车辆数/表中包含车辆数/车辆总数/表中包含总车辆正确"
    },
    {
      "action": "hive维表设置编辑如下：\n「数据源」选择「hive2」\n「数据库」选择「databaseB」\n「数据表」选择「tableB」\n「车辆数统计字段」选择「vin」\n「车系关联字段」选择「car_config」\n「车型关联字段」选择「car_series」\n「动力类型关联字段」选择「car_power」",
      "expected": "配置成功"
    },
    {
      "action": "点击其他tab页面",
      "expected": "提示\"修改内容没有保存，退出页面后编辑内容无法生效，请确认是否退出\""
    },
    {
      "action": "点击「取消」按钮",
      "expected": "恢复到上次保存的状态"
    },
    {
      "action": "点击「保存」按钮",
      "expected": "hive维表更新配置成功"
    },
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

test.describe("验证「报告关联维表设置Hive」配置更新生效校验", () => {
  test("C1049 验证「报告关联维表设置Hive」配置更新生效校验", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
