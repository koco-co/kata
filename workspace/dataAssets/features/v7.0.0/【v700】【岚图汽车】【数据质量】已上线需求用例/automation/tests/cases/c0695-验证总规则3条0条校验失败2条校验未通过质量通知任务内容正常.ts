// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0695",
  "title": "验证总规则 3条，0条校验失败，2条校验未通过质量通知任务内容正常",
  "steps": [
    {
      "action": "立即执行该质量规则，等待任务执行完成",
      "expected": "成功触发告警"
    },
    {
      "action": "查看钉钉  / 邮件告警文本内容",
      "expected": "租户：iov_prd | 项目：车云_大数据_生产\n监控任务：国标监控规则\n数据源：iov_bd_prd_HADOOP\n执行时间：2026-07-26 10:00:11\n监控表：ods_gb_veh_data_all_view\n异常汇总：校验规则总数为3条，其中0条规则校验失败，1条规则校验未通过。"
    }
  ]
} as const;

test.describe("验证总规则 3条，0条校验失败，2条校验未通过质量通知任务内容正常", () => {
  test("C0695 验证总规则 3条，0条校验失败，2条校验未通过质量通知任务内容正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
