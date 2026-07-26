// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C307",
  "title": "验证【完整性校验-字段级-字段取值校验】质量规则任务校验正常(多字段+and+>=/包含)",
  "steps": [
    {
      "action": "进入【数据质量 → 规则集管理】, 点击「新建规则集」:\n- 选择数据源: SparkThrift2.x\n- 选择数据库: ${SchemaA}\n- 选择数据表: dwd_voyah_dq_rule_05_main\n- 规则集描述: 完整性校验-字段级-字段取值校验\n- 新增规则包名称: 完整性校验-字段级-字段取值校验规则包\n点击「下一步」",
      "expected": "1)规则集基础信息保存成功\n2)规则包创建成功"
    },
    {
      "action": "选择规则包(完整性校验-字段级-字段取值校验规则包), 新增「完整性校验」规则:\n- 生效范围: 字段级\n- 字段: final_price,power_type\n- 字段间规则逻辑: and\n- 统计函数: 字段取值校验\n- 过滤条件: 选项配置，点击配置后保持无过滤\n- 期望值: final_price >= 0; power_type 包含 EV/PHEV/REEV\n- 强弱规则: 强规则\n- 规则描述: 校验字段取值分区结果\n点击「保存」并保存规则集\n保存规则后再次编辑该规则，修改规则描述并保存，再恢复为「校验字段取值分区结果」",
      "expected": "1)规则保存成功\n2)规则集详情中展示「完整性校验-字段级-字段取值校验」规则\n3)规则配置项保存后回显正确\n4)规则描述展示为「校验字段取值分区结果」\n5)规则编辑保存成功\n6)规则配置和规则描述按最新保存内容回显"
    },
    {
      "action": "进入【数据质量 → 规则任务管理】, 点击「新建监控规则」:\n- 规则名称: SparkThrift2.x+完整性校验-字段级-字段取值校验\n- 选择数据源: SparkThrift2.x\n- 选择数据库: ${SchemaA}\n- 选择数据表: dwd_voyah_dq_rule_05_main\n- 选择已有分区: stat_date='20260116'\n点击「下一步」",
      "expected": "1)监控对象配置成功\n2)进入监控规则页面"
    },
    {
      "action": "在「监控规则」中引用质量规则:\n- 规则包: 完整性校验-字段级-字段取值校验规则包\n- 规则类型: 完整性校验\n点击「下一步」",
      "expected": "1)监控规则配置成功\n2)进入调度属性页面"
    },
    {
      "action": "在「调度属性」中配置:\n1)调度配置:\n- 调度周期: 手动触发\n- 规则拼接包: 1\n- 实例生成方式: 立即生成\n- 超时时间: 不限制\n2)告警配置: 无\n3)报告配置: 无需生成报告\n点击保存, 进入规则任务${SchemaA}.dwd_voyah_dq_rule_05_main详情页, 点击「立即执行」",
      "expected": "1)调度属性配置成功\n2)规则任务保存成功\n3)进入规则任务${SchemaA}.dwd_voyah_dq_rule_05_main详情页\n4)任务提交执行成功"
    },
    {
      "action": "进入【数据质量 → 校验结果查询】, 查询任务名称(SparkThrift2.x+完整性校验-字段级-字段取值校验)最新实例详情",
      "expected": "1)最新实例为「校验通过」\n2)final_price,power_type 实际值为 全部满足 final_price >= 0 且 power_type 属于 EV/PHEV/REEV\n3)规则期望值或判断条件展示正确\n4)明细仅统计 stat_date='20260116' 分区"
    },
    {
      "action": "进入【数据质量 → 规则任务管理】, 编辑规则任务(SparkThrift2.x+完整性校验-字段级-字段取值校验), 仅变更选择分区:\n- 选择已有分区: stat_date='20260116' -> stat_date='20260115'\n保存后再次点击「立即执行」",
      "expected": "1)规则集和规则包内容未改动\n2)任务分区保存成功\n3)任务提交执行成功"
    },
    {
      "action": "进入【数据质量 → 校验结果查询】, 查询任务名称(SparkThrift2.x+完整性校验-字段级-字段取值校验)最新实例详情",
      "expected": "1)最新实例为「校验不通过」\n2)final_price,power_type 实际值为 1\n3)规则期望值或判断条件展示正确\n4)不通过明细包含 order_id=ORD_05_F003, final_price=-100.000\n5)明细仅统计 stat_date='20260115' 分区"
    }
  ]
} as const;

test.describe("验证【完整性校验-字段级-字段取值校验】质量规则任务校验正常(多字段+and+>=/包含)", () => {
  test("C307 验证【完整性校验-字段级-字段取值校验】质量规则任务校验正常(多字段+and+>=/包含)", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
