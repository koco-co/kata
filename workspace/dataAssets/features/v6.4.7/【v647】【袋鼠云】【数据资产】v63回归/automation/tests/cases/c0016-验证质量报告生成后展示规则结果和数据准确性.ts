// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0016",
  "title": "验证质量报告生成后展示规则结果和数据准确性",
  "steps": [
    {
      "action": "进入【数据质量 → 质量报告】页面，等待报告列表加载完成",
      "expected": "页面 URL 为 `#/dq/qualityReport`，展示报告列表和生成报告入口"
    },
    {
      "action": "点击生成报告入口，等待报告生成表单加载完成",
      "expected": "表单展示数据源、数据库、数据表、报告周期字段"
    },
    {
      "action": "选择 SparkThrift 数据源",
      "expected": "数据库下拉框加载完成"
    },
    {
      "action": "选择数据库 pw_test",
      "expected": "数据表下拉框加载完成"
    },
    {
      "action": "选择数据表 dq_test_user_info_300，报告周期选择一次性",
      "expected": "表单中所选库表与已执行过的质量任务一致"
    },
    {
      "action": "点击【确定】，等待报告生成任务提交完成",
      "expected": "提示报告生成任务提交成功"
    },
    {
      "action": "轮询报告列表直到新报告记录出现",
      "expected": "报告列表展示 dq_test_user_info_300 的最新报告记录"
    },
    {
      "action": "打开最新报告详情，等待详情页面加载完成",
      "expected": "报告详情展示数据源、数据库、数据表、报告生成时间和规则结果区域"
    },
    {
      "action": "查看准确性规则结果",
      "expected": "score 求和、平均值、负值比、零值比、正值比均等于执行前 SparkThrift 统计 SQL 的对应预期值"
    },
    {
      "action": "查看格式规则结果",
      "expected": "身份证号、手机号、邮箱格式规则的不通过数均等于执行前 SparkThrift 统计 SQL 的对应预期值，数据准确性统计与任务实例查询一致"
    }
  ]
} as const;

test.describe("验证质量报告生成后展示规则结果和数据准确性", () => {
  test("C0016 验证质量报告生成后展示规则结果和数据准确性", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
