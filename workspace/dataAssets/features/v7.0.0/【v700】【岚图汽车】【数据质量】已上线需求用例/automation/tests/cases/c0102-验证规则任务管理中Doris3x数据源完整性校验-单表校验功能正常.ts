// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0102",
  "title": "验证「规则任务管理」中 Doris 3.x 数据源 「完整性校验-单表校验」功能正常",
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
      "action": "「校验类型」选择「单表」「统计函数」 选择「表行数」「过滤条件」 无「校验方法」选择「固定值」「期望值」选择「>5」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」",
      "expected": "配置完成"
    },
    {
      "action": "点击「保存」按钮",
      "expected": "规则配置保存正确"
    },
    {
      "action": "点击「下一步」，配置「调度属性」:「报告名称」保持默认名称「报告类型」保持默认「质检式」「报告统计规则范围」默认选择「全部」「报告周期」选择「一次性」「数据周期」选择「T~T」「结果展示」 选择「展示最新结果」「是否需要车辆信息」选择「是」",
      "expected": "调度属性配置完成"
    },
    {
      "action": "点击「完成」按钮",
      "expected": "规则保存成功"
    },
    {
      "action": "立即运行、周期运行",
      "expected": "任务实例状态由「运行中」 > 「校验通过」"
    },
    {
      "action": "进入「规则任务管理」页面, 重新编辑任务规则, 将「期望值」改为「<5」, 其他保持不变, 重新运行",
      "expected": "任务实例详情页面显示「校验未通过」标识"
    },
    {
      "action": "进入「离线开发-周期任务」页面, 执行DROP语句删除vehicle_info_part6表后, 返回资产平台重新运行规则任务",
      "expected": "1) 任务实例状态由「运行中」 > 「校验异常」2) 任务实例详情页面显示「校验失败」标识, 可支持查看日志"
    },
    {
      "action": "点击「查看日志」",
      "expected": "表已删除, Unknown table 'vehicle_info_part6'"
    }
  ]
} as const;

test.describe("验证「规则任务管理」中 Doris 3.x 数据源 「完整性校验-单表校验」功能正常", () => {
  test("C0102 验证「规则任务管理」中 Doris 3.x 数据源 「完整性校验-单表校验」功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
