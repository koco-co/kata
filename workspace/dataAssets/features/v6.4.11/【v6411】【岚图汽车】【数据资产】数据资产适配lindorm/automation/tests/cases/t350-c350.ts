// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C350",
  "title": "验证【数据质量报告-已配置报告】新增单表报告功能正常",
  "steps": [
    {
      "action": "在【规则集管理】和【规则任务管理】准备单表报告依赖:\n- 数据源: SparkThrift2.x\n- 数据库: ${SchemaA}\n- 数据表: dwd_supplier_info_di\n- 规则集: 供应商主数据质量规则集\n- 规则包: 完整性规则包、有效性规则包\n- 任务: 供应商主数据完整性任务、供应商主数据有效性任务\n- 调度周期: 手动触发\n- 实例生成方式: 立即生成\n分别立即执行两条任务",
      "expected": "1)规则集和规则包保存成功\n2)两条规则任务均执行完成\n3)【校验结果查询】中可查询到两条任务最新实例\n4)任务报告配置未勾选「无需生成报告」"
    },
    {
      "action": "进入【数据质量 → 数据质量报告】页面，确认不存在同名报告「SparkThrift2.x单表主流程报告」",
      "expected": "1)页面展示「已配置报告」「已生成报告」页签\n2)「已配置报告」列表列包含「报告名称」「报告类型」「关联数据表」「报告周期」「生成样式」「规则范围」「创建人」「创建时间」「修改人」「修改时间」「操作」\n3)同名报告不存在，避免与本次新增冲突"
    },
    {
      "action": "点击「新增报告」并配置:\n- 报告名称: SparkThrift2.x单表主流程报告\n- 生成样式: 质检式\n- 规则范围: 全部\n- 关联数据表: SparkThrift2.x / ${SchemaA} / dwd_supplier_info_di\n- 报告周期: 天\n- 展示方式: 展示最新结果\n- 是否需要车辆信息: 是\n- 选择任务: 全部\n点击「确定」保存报告",
      "expected": "1)报告保存成功\n2)已配置报告列表展示「SparkThrift2.x单表主流程报告」\n3)报告类型展示为「单表报告」\n4)关联数据表展示为「dwd_supplier_info_di」\n5)规则范围展示为「全部」"
    }
  ]
} as const;

test.describe("验证【数据质量报告-已配置报告】新增单表报告功能正常", () => {
  test("C350 验证【数据质量报告-已配置报告】新增单表报告功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
