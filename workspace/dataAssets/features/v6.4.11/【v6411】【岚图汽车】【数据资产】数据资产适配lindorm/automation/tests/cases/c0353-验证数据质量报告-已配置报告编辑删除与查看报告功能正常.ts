// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0353",
  "title": "验证【数据质量报告-已配置报告】编辑、删除与查看报告功能正常",
  "steps": [
    {
      "action": "准备可编辑自定义报告「车辆订单质量日报」:\n- 报告类型: 自定义报告\n- 关联数据表: ${SchemaA}.dwd_vehicle_order_di\n- 关联任务: 车辆订单唯一性任务\n- 报告周期: 天\n- 生成样式: 质检式\n- 规则范围: 全部\n同时确保该报告已有一条生成成功记录",
      "expected": "1)已配置报告列表存在「车辆订单质量日报」\n2)已生成报告列表存在同名生成成功记录\n3)操作列展示「编辑」「查看报告」「删除」"
    },
    {
      "action": "在已配置报告列表点击「编辑」，修改:\n- 报告周期: 周\n- 展示方式: 展示全部结果\n点击「确定」保存",
      "expected": "1)编辑报告成功\n2)列表回显报告周期为「周」\n3)修改人和修改时间更新"
    },
    {
      "action": "点击该报告操作列「查看报告」",
      "expected": "1)跳转到该报告的已生成报告记录或报告详情\n2)报告名称与当前配置报告一致\n3)报告基础信息展示最新配置"
    },
    {
      "action": "返回已配置报告列表，点击该报告「删除」并确认",
      "expected": "1)删除确认文案提示删除后不会生成报告且已生成报告也会一并删除\n2)确认后删除成功\n3)已配置报告列表不再展示「车辆订单质量日报」"
    }
  ]
} as const;

test.describe("验证【数据质量报告-已配置报告】编辑、删除与查看报告功能正常", () => {
  test("C0353 验证【数据质量报告-已配置报告】编辑、删除与查看报告功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
