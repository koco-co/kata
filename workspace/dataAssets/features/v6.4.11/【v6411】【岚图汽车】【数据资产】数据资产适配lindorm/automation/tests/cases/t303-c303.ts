// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C303",
  "title": "验证【完整性校验-字段级-空值数】质量规则任务校验正常(单字段+固定值+=)",
  "steps": [
    {
      "action": "进入【数据质量 → 规则集管理】, 点击「新建规则集」:\n- 选择数据源: SparkThrift2.x\n- 选择数据库: ${SchemaA}\n- 选择数据表: dwd_voyah_dq_rule_01_main\n- 规则集描述: 完整性校验-字段级-空值数\n- 新增规则包名称: 完整性校验-字段级-空值数规则包\n点击「下一步」",
      "expected": "1)规则集基础信息保存成功\n2)规则包创建成功"
    },
    {
      "action": "返回【数据质量 → 规则集管理】列表，在「输入表名搜索」输入 dwd_voyah_dq_rule_01_main 并查询；点击表名查看规则集详情；再点击「新建规则集」，选择 SparkThrift2.x / ${SchemaA} 后打开「选择数据表」下拉",
      "expected": "1)列表仅展示匹配规则集\n2)规则包数量、规则数量展示为非负整数\n3)规则集详情展示表名、所属数据库、所属数据源、规则包数量、规则数量、规则集描述、更新人、更新时间和规则详情\n4)已配置规则集的数据表不再出现在可选列表，未配置规则集的数据表可选择"
    },
    {
      "action": "选择规则包(完整性校验-字段级-空值数规则包), 新增「完整性校验」规则:\n- 生效范围: 字段级\n- 字段: car_model_name\n- 统计函数: 空值数\n- 过滤条件: 选项配置，点击配置后保持无过滤\n- 校验方法: 固定值\n- 期望值: = 0\n- 强弱规则: 强规则\n- 规则描述: 校验空值数分区结果\n点击「保存」并保存规则集",
      "expected": "1)规则保存成功\n2)规则集详情中展示「完整性校验-字段级-空值数」规则\n3)规则配置项保存后回显正确\n4)规则描述展示为「校验空值数分区结果」"
    },
    {
      "action": "进入【数据质量 → 规则任务管理】, 点击「新建监控规则」:\n- 规则名称: SparkThrift2.x+完整性校验-字段级-空值数\n- 选择数据源: SparkThrift2.x\n- 选择数据库: ${SchemaA}\n- 选择数据表: dwd_voyah_dq_rule_01_main\n- 选择已有分区: stat_date='20260116'\n点击「下一步」",
      "expected": "1)监控对象配置成功\n2)进入监控规则页面"
    },
    {
      "action": "在「监控规则」中引用质量规则:\n- 规则包: 完整性校验-字段级-空值数规则包\n- 规则类型: 完整性校验\n点击「下一步」",
      "expected": "1)监控规则配置成功\n2)进入调度属性页面\n3)引入后的规则块仅支持删除，编辑和克隆入口不可用"
    },
    {
      "action": "在「调度属性」中先配置:\n1)调度配置:\n- 调度周期: 天\n- 实例生成方式: T+1生成\n- 超时时间: 不限制\n2)环境参数:\n- logLevel=ERROR\n- spark.executor.cores=2\n- spark.executor.instances=2\n- spark.executor.memory=2g\n- spark.sql.shuffle.partitions=10\n- spark.network.timeout=300s\n- spark.driver.maxResultSize=2g\n3)告警配置: 无\n4)报告配置: 无需生成报告\n点击保存，确认不会立即生成实例；再编辑调度属性改为「手动触发」「立即生成」，保存后进入规则任务${SchemaA}.dwd_voyah_dq_rule_01_main详情页，点击「立即执行」",
      "expected": "1)T+1 配置保存成功且任务详情回显为 T+1生成\n2)保存后不会立即生成实例\n3)环境参数在任务详情中按名称和值回显，执行时绑定本任务 application_id\n4)改为立即生成后任务保存成功\n5)任务提交执行成功"
    },
    {
      "action": "进入【数据质量 → 校验结果查询】, 查询任务名称(SparkThrift2.x+完整性校验-字段级-空值数)最新实例详情",
      "expected": "1)最新实例为「校验通过」\n2)car_model_name 实际值为 0\n3)规则期望值或判断条件展示正确\n4)明细仅统计 stat_date='20260116' 分区\n5)校验通过时未通过原因为「--」，操作列不展示「查看详情」或「查看明细」入口"
    },
    {
      "action": "进入【数据质量 → 规则任务管理】, 编辑规则任务(SparkThrift2.x+完整性校验-字段级-空值数), 仅变更选择分区:\n- 选择已有分区: stat_date='20260116' -> stat_date='20260115'\n保存后再次点击「立即执行」",
      "expected": "1)规则集和规则包内容未改动\n2)任务分区保存成功\n3)任务提交执行成功"
    },
    {
      "action": "进入【数据质量 → 校验结果查询】, 查询任务名称(SparkThrift2.x+完整性校验-字段级-空值数)最新实例详情",
      "expected": "1)最新实例为「校验不通过」\n2)car_model_name 实际值为 1\n3)规则期望值或判断条件展示正确\n4)不通过明细包含 order_id=ORD_01_F003\n5)明细仅统计 stat_date='20260115' 分区"
    }
  ]
} as const;

test.describe("验证【完整性校验-字段级-空值数】质量规则任务校验正常(单字段+固定值+=)", () => {
  test("C303 验证【完整性校验-字段级-空值数】质量规则任务校验正常(单字段+固定值+=)", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
