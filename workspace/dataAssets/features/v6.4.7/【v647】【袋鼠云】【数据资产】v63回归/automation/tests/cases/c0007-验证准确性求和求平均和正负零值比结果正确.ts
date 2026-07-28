// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0007",
  "title": "验证准确性求和求平均和正负零值比结果正确",
  "steps": [
    {
      "action": "进入【数据质量 → 规则任务配置】页面，点击【新建监控规则】，等待监控对象页面加载完成",
      "expected": "进入新建单表校验规则流程"
    },
    {
      "action": "输入规则名称“v63准确性任务”",
      "expected": "规则名称输入框展示“v63准确性任务”"
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
      "action": "选择数据表 dq_test_user_info_300",
      "expected": "监控对象配置完成，数据预览区域可查看 score 字段"
    },
    {
      "action": "点击【下一步】，等待监控规则页面加载完成",
      "expected": "页面展示【添加规则】按钮"
    },
    {
      "action": "点击【添加规则】，等待规则编辑表单加载完成",
      "expected": "表单展示规则类型、字段、统计函数、校验方法、期望值配置项"
    },
    {
      "action": "选择规则类型【准确性校验】，字段选择 score",
      "expected": "准确性统计函数下拉框加载完成"
    },
    {
      "action": "在同一规则中依次添加统计函数【求和】等于 `{score_sum}`、【求平均】等于 `{score_avg}`、【负值比】等于 `{score_negative_rate}`、【零值比】等于 `{score_zero_rate}`、【正值比】等于 `{score_positive_rate}`",
      "expected": "统计规则区域展示 5 条配置，字段均为 score"
    },
    {
      "action": "强弱规则选择强规则，点击规则行【保存】，等待规则卡片保存完成",
      "expected": "规则卡片展示 score 字段的 5 条准确性统计配置"
    },
    {
      "action": "进入调度属性，实例生成方式选择【立即生成】，点击【保存】并等待任务列表刷新完成",
      "expected": "任务“v63准确性任务”创建成功"
    },
    {
      "action": "点击【立即执行】，等待任务实例查询生成最新实例",
      "expected": "最新实例状态为校验通过，score 求和、平均值、负值比、零值比、正值比均等于执行前 SparkThrift 统计 SQL 的对应预期值"
    },
    {
      "action": "编辑规则，将 score 求和期望值改为 `{score_sum}+1` 后重新执行",
      "expected": "最新实例状态为校验异常，score 求和实际值仍为 `{score_sum}`"
    }
  ]
} as const;

test.describe("验证准确性求和求平均和正负零值比结果正确", () => {
  test("C0007 验证准确性求和求平均和正负零值比结果正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
