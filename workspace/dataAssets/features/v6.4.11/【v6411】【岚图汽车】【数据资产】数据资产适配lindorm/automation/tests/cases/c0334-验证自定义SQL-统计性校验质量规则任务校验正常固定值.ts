// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0334",
  "title": "验证【自定义SQL-统计性校验】质量规则任务校验正常(固定值+<)",
  "steps": [
    {
      "action": "进入【数据质量 → 规则库配置】, 切换到【自定义SQL模版】并点击「新增自定义sql模版」:\n- 规则名称: 自定义SQL统计性异常价格模板\n- 规则分类: 统计性校验\n- 关联范围: 字段\n- 规则描述: 自定义SQL-统计性校验模板\n- 自定义配置: select count(*) from ${test_table} where final_price > 900000;\n- 参数配置:\n- 参数: ${test_table}\n- 类型: 当前校验表\n- 参数名称: 当前校验表\n- 参数说明: 当前任务主表\n点击「保存」",
      "expected": "1)自定义SQL模版保存成功\n2)列表展示该自定义SQL模版\n3)规则分类、关联范围、规则描述回显正确\n4)参数列表按SQL中的参数自动解析并展示，参数、类型、参数名称、参数说明保存后回显正确"
    },
    {
      "action": "进入【数据质量 → 规则集管理】, 点击「新建规则集」:\n- 选择数据源: SparkThrift2.x\n- 选择数据库: ${SchemaA}\n- 选择数据表: dwd_voyah_dq_rule_32_main\n- 规则集描述: 自定义SQL-统计性校验\n- 新增规则包名称: 自定义SQL-统计性校验规则包\n点击「下一步」",
      "expected": "1)规则集基础信息保存成功\n2)规则包创建成功"
    },
    {
      "action": "选择规则包(自定义SQL-统计性校验规则包), 新增「自定义SQL」规则:\n- 规则类型: 统计性校验\n- 引用规则: 自定义SQL统计性异常价格模板\n- SQL面板: 自动回显引用规则中的自定义配置且不可编辑\n- 参数值:\n- ${test_table}: 使用规则任务当前监控对象\n- 校验字段: final_price\n- 校验方法: 固定值\n- 期望值: < 1\n- 强弱规则: 强规则\n- 规则描述: 校验统计性校验SQL结果\n点击「保存」并保存规则集",
      "expected": "1)引用规则选择成功\n2)SQL面板回显引用规则中的自定义配置且不支持编辑\n3)参数列表与自定义SQL模版配置一致\n4)校验字段保存后回显正确\n5)规则保存成功\n6)规则集详情中展示「自定义SQL-统计性校验」规则\n7)规则描述保存后回显正确"
    },
    {
      "action": "进入【数据质量 → 规则任务管理】, 点击「新建监控规则」:\n- 规则名称: SparkThrift2.x+自定义SQL-统计性校验\n- 选择数据源: SparkThrift2.x\n- 选择数据库: ${SchemaA}\n- 选择数据表: dwd_voyah_dq_rule_32_main\n- 选择已有分区: stat_date='20260116'\n点击「下一步」",
      "expected": "1)监控对象配置成功\n2)进入监控规则页面"
    },
    {
      "action": "在「监控规则」中通过「导入规则包」引用质量规则:\n- 规则包: 自定义SQL-统计性校验规则包\n- 规则类型: 自定义SQL\n点击「下一步」",
      "expected": "1)监控规则配置成功\n2)引用规则来源为规则集中已引用的自定义SQL模版\n3)进入调度属性页面"
    },
    {
      "action": "在「调度属性」中配置:\n1)调度配置:\n- 调度周期: 手动触发\n- 规则拼接包: 1\n- 实例生成方式: 立即生成\n- 超时时间: 不限制\n2)告警配置: 无\n3)报告配置: 无需生成报告\n点击保存, 进入规则任务${SchemaA}.dwd_voyah_dq_rule_32_main详情页, 点击「立即执行」",
      "expected": "1)调度属性配置成功\n2)规则任务保存成功\n3)进入规则任务${SchemaA}.dwd_voyah_dq_rule_32_main详情页\n4)任务提交执行成功"
    },
    {
      "action": "进入【数据质量 → 校验结果查询】, 查询任务名称(SparkThrift2.x+自定义SQL-统计性校验)最新实例详情",
      "expected": "1)最新实例为「校验通过」\n2)SQL high-price 实际值为 0\n3)规则期望值或判断条件展示正确\n4)明细仅统计 stat_date='20260116' 分区"
    },
    {
      "action": "进入【数据质量 → 规则任务管理】, 编辑规则任务(SparkThrift2.x+自定义SQL-统计性校验), 仅变更选择分区:\n- 选择已有分区: stat_date='20260116' -> stat_date='20260115'\n保存后再次点击「立即执行」",
      "expected": "1)规则库配置中的自定义SQL模版未改动\n2)规则集和规则包内容未改动\n3)任务分区保存成功\n4)任务提交执行成功"
    },
    {
      "action": "进入【数据质量 → 校验结果查询】, 查询任务名称(SparkThrift2.x+自定义SQL-统计性校验)最新实例详情",
      "expected": "1)最新实例为「校验不通过」\n2)SQL high-price 实际值为 1\n3)规则期望值或判断条件展示正确\n4)不通过明细包含 order_id=ORD_32_F004, final_price=999999.000\n5)明细仅统计 stat_date='20260115' 分区"
    }
  ]
} as const;

test.describe("验证【自定义SQL-统计性校验】质量规则任务校验正常(固定值+<)", () => {
  test("C0334 验证【自定义SQL-统计性校验】质量规则任务校验正常(固定值+<)", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
