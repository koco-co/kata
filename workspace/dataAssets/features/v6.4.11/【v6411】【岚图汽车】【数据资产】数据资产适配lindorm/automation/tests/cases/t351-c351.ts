// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C351",
  "title": "验证【数据质量报告-已配置报告】新增自定义报告功能正常",
  "steps": [
    {
      "action": "在【规则集管理】和【规则任务管理】准备自定义报告依赖:\n- 表1: ${SchemaA}.dwd_supplier_info_di，任务: 供应商主数据完整性任务\n- 表2: ${SchemaA}.dwd_vehicle_order_di，任务: 车辆订单唯一性任务\n- 两个任务均配置「调度周期: 手动触发」「实例生成方式: 立即生成」并完成执行",
      "expected": "1)两张表均已有可用规则集\n2)两条规则任务均执行完成\n3)【校验结果查询】中可查询到两张表的最新实例"
    },
    {
      "action": "进入【数据质量 → 数据质量报告】，确认不存在同名报告「SparkThrift2.x自定义主流程报告」",
      "expected": "1)已配置报告列表加载完成\n2)同名报告不存在"
    },
    {
      "action": "点击「新增报告」并配置:\n- 报告名称: SparkThrift2.x自定义主流程报告\n- 生成样式: 质检式\n- 规则范围: 全部\n- 关联数据表: ${SchemaA}.dwd_supplier_info_di、${SchemaA}.dwd_vehicle_order_di\n- 报告周期: 一次性\n- 展示方式: 展示全部结果\n- 选择任务: 全部\n点击「确定」保存报告",
      "expected": "1)自定义报告保存成功\n2)已配置报告列表展示该报告\n3)报告类型展示为「自定义报告」\n4)关联数据表展示两张表信息"
    },
    {
      "action": "切换到「已生成报告」页签，按报告名称查询「SparkThrift2.x自定义主流程报告」",
      "expected": "1)生成记录可查询到\n2)报告状态从「待生成」进入后续生成流程\n3)生成成功后操作列展示「报告详情」「下载」"
    }
  ]
} as const;

test.describe("验证【数据质量报告-已配置报告】新增自定义报告功能正常", () => {
  test("C351 验证【数据质量报告-已配置报告】新增自定义报告功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
