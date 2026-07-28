// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0347",
  "title": "验证【合理性校验-多表字段值对比-计算结果值判断】质量规则任务校验正常(单主键+<=)",
  "steps": [
    {
      "action": "进入【数据质量 → 规则集管理】, 点击「新建规则集」:\n- 选择数据源: SparkThrift2.x\n- 选择数据库: ${SchemaA}\n- 选择数据表: dwd_voyah_dq_rule_44_main\n- 选择对比表: dwd_voyah_dq_rule_44_ref\n- 规则集描述: 合理性校验-多表字段值对比-计算结果值判断\n- 新增规则包名称: 合理性校验-多表字段值对比-计算结果值判断规则包\n点击「下一步」",
      "expected": "1)规则集基础信息保存成功\n2)规则包创建成功"
    },
    {
      "action": "选择规则包(合理性校验-多表字段值对比-计算结果值判断规则包), 新增「合理性校验」规则:\n- 字段: final_price\n- 统计函数: 多表字段值对比\n- 校验表主键: vin\n- 过滤条件: 选项配置，点击配置后保持无过滤\n- 关联表: dwd_voyah_dq_rule_44_ref\n- 关联表分区: 选择已有分区 stat_date='20260116'\n- 关联表主键: vin\n- 计算逻辑配置: guide_price - final_price\n- 对比方法: 计算结果值判断\n- 结果值: <= 1000000\n- 强弱规则: 强规则\n- 规则描述: 校验多表计算判断分区结果\n点击「保存」并保存规则集",
      "expected": "1)规则保存成功\n2)规则集详情中展示「合理性校验-多表字段值对比-计算结果值判断」规则\n3)规则配置项保存后回显正确\n4)规则描述展示为「校验多表计算判断分区结果」"
    },
    {
      "action": "进入【数据质量 → 规则任务管理】, 点击「新建监控规则」:\n- 规则名称: SparkThrift2.x+合理性校验-多表字段值对比-计算结果值判断\n- 选择数据源: SparkThrift2.x\n- 选择数据库: ${SchemaA}\n- 选择数据表: dwd_voyah_dq_rule_44_main\n- 选择对比表: dwd_voyah_dq_rule_44_ref\n- 选择已有分区: stat_date='20260116'\n点击「下一步」",
      "expected": "1)监控对象配置成功\n2)进入监控规则页面"
    },
    {
      "action": "在「监控规则」中引用质量规则:\n- 规则包: 合理性校验-多表字段值对比-计算结果值判断规则包\n- 规则类型: 合理性校验\n点击「下一步」",
      "expected": "1)监控规则配置成功\n2)进入调度属性页面"
    },
    {
      "action": "在「调度属性」中配置:\n1)调度配置:\n- 调度周期: 手动触发\n- 规则拼接包: 1\n- 实例生成方式: 立即生成\n- 超时时间: 不限制\n2)告警配置: 无\n3)报告配置: 无需生成报告\n点击保存, 进入规则任务${SchemaA}.dwd_voyah_dq_rule_44_main、dwd_voyah_dq_rule_44_ref详情页, 点击「立即执行」",
      "expected": "1)调度属性配置成功\n2)规则任务保存成功\n3)进入规则任务${SchemaA}.dwd_voyah_dq_rule_44_main、dwd_voyah_dq_rule_44_ref详情页\n4)任务提交执行成功"
    },
    {
      "action": "进入【数据质量 → 校验结果查询】, 查询任务名称(SparkThrift2.x+合理性校验-多表字段值对比-计算结果值判断)最新实例详情",
      "expected": "1)最新实例为「校验通过」\n2)main/ref calculated difference 实际值为 全部 <= 1000000\n3)规则期望值或判断条件展示正确\n4)明细仅统计 stat_date='20260116' 分区"
    },
    {
      "action": "进入【数据质量 → 规则任务管理】, 编辑规则任务(SparkThrift2.x+合理性校验-多表字段值对比-计算结果值判断), 仅变更选择分区:\n- 选择已有分区: stat_date='20260116' -> stat_date='20260115'\n保存后再次点击「立即执行」",
      "expected": "1)规则集和规则包内容未改动\n2)任务分区保存成功\n3)任务提交执行成功"
    },
    {
      "action": "进入【数据质量 → 校验结果查询】, 查询任务名称(SparkThrift2.x+合理性校验-多表字段值对比-计算结果值判断)最新实例详情",
      "expected": "1)最新实例为「校验不通过」\n2)main/ref calculated difference 实际值为 1\n3)规则期望值或判断条件展示正确\n4)不通过明细包含 vin=LTV202601150003AA 的跨表计算差值 > 1000000\n5)明细仅统计 stat_date='20260115' 分区"
    }
  ]
} as const;

test.describe("验证【合理性校验-多表字段值对比-计算结果值判断】质量规则任务校验正常(单主键+<=)", () => {
  test("C0347 验证【合理性校验-多表字段值对比-计算结果值判断】质量规则任务校验正常(单主键+<=)", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
