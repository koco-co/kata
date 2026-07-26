// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C096",
  "title": "验证「规则任务管理」中 Doris 3.x 数据源「自定义SQL」功能正常",
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
      "action": "配置「数据源」「数据库」「数据表」vehicle_info_part1等信息，选择【自定义SQL】规则",
      "expected": "选择成功，展示【自定义SQL】规则配置项"
    },
    {
      "action": "「sql」输入「SELECT * FROM vehicle_info_part1 WHERE is_certific IS NULL;」「校验方法」选择「固定值」「期望值」选择「=1」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」",
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
      "expected": "任务实例状态由「运行中」 > 「校验通过」1) 任务实例详情弹窗中存在「校验通过」的标识2) 不记录明细数据；"
    },
    {
      "action": "进入「规则任务管理」页面, 重新编辑任务规则:「期望值」改为「=0」其他保持不变, 重新运行",
      "expected": "1) 任务实例状态由「运行中」 > 「校验异常」2) 任务实例详情页面显示「校验未通过」标识, 可支持查看明细, 明细按照表和校验字段记录不符合规则的数值"
    },
    {
      "action": "点击「查看明细」",
      "expected": "展示校验表明细数据"
    },
    {
      "action": "进入「离线开发-周期任务」页面, 执行DROP语句删除vehicle_info_part1表后, 返回资产平台重新运行规则任务",
      "expected": "1) 任务实例状态由「运行中」 > 「校验异常」2) 任务实例详情页面显示「校验失败」标识, 可支持查看日志"
    },
    {
      "action": "点击「查看日志」",
      "expected": "表已删除, Unknown table 'vehicle_info_part1'"
    }
  ]
} as const;

test.describe("验证「规则任务管理」中 Doris 3.x 数据源「自定义SQL」功能正常", () => {
  test("C096 验证「规则任务管理」中 Doris 3.x 数据源「自定义SQL」功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
