// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0360",
  "title": "验证【数据质量报告-报告详情】脏数据明细查看与下载正常",
  "steps": [
    {
      "action": "准备校验不通过报告「车辆订单唯一性日报」:\n- 关联数据表: ${SchemaA}.dwd_vehicle_order_di\n- 规则任务: 车辆订单唯一性任务\n- 规则: vin重复数校验\n- 失败明细: vin=LTV202603290001AA 存在2条重复记录\n- 报告状态: 已生成",
      "expected": "1)校验结果查询中存在「车辆订单唯一性任务」校验不通过实例\n2)报告详情中对应规则行展示「查看详情」操作\n3)脏数据明细可下载"
    },
    {
      "action": "进入【数据质量 → 数据质量报告 → 已生成报告】，查询「车辆订单唯一性日报」并点击「报告详情」",
      "expected": "1)进入报告详情页\n2)质量评估汇总展示车辆订单唯一性任务结果"
    },
    {
      "action": "在规则校验明细中点击「vin重复数校验」的「查看详情」",
      "expected": "1)明细弹窗或明细页打开\n2)展示 vin=LTV202603290001AA 的重复数据\n3)校验字段高亮或标红展示"
    },
    {
      "action": "点击明细中的下载入口",
      "expected": "1)下载文件生成成功\n2)文件内容包含重复数据明细\n3)下载内容与页面明细一致"
    }
  ]
} as const;

test.describe("验证【数据质量报告-报告详情】脏数据明细查看与下载正常", () => {
  test("C0360 验证【数据质量报告-报告详情】脏数据明细查看与下载正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
