// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0006",
  "title": "验证自定义 SQL 单表规则通过和不通过结果正确",
  "steps": [
    {
      "action": "进入【数据质量 → 规则任务配置】页面，点击【新建监控规则】，等待监控对象页面加载完成",
      "expected": "进入新建单表校验规则流程"
    },
    {
      "action": "输入规则名称“v63自定义SQL任务”",
      "expected": "规则名称输入框展示“v63自定义SQL任务”"
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
      "expected": "监控对象配置完成，数据预览区域可查看表字段"
    },
    {
      "action": "点击【下一步】，等待监控规则页面加载完成",
      "expected": "页面展示【添加规则】按钮"
    },
    {
      "action": "点击【添加规则】，等待规则编辑表单加载完成",
      "expected": "表单展示规则类型和自定义 SQL 配置项"
    },
    {
      "action": "选择规则类型【自定义SQL】",
      "expected": "自定义 SQL 输入框和期望值配置项展示"
    },
    {
      "action": "输入 SQL：`SELECT id FROM dq_test_user_info_300 WHERE status='A'`",
      "expected": "SQL 输入框展示完整 SQL"
    },
    {
      "action": "校验方法选择固定值，操作符选择等于，期望值输入 `{status_a_cnt}`，强弱规则选择强规则，点击【保存】，等待规则卡片保存完成",
      "expected": "规则卡片展示自定义 SQL、期望值等于 `{status_a_cnt}`"
    },
    {
      "action": "进入调度属性，实例生成方式选择【立即生成】，点击【保存】并等待任务列表刷新完成",
      "expected": "任务“v63自定义SQL任务”创建成功"
    },
    {
      "action": "点击【立即执行】，等待任务实例查询生成最新实例",
      "expected": "最新实例状态为校验通过，自定义 SQL 明细查询结果行数为 `{status_a_cnt}`"
    },
    {
      "action": "编辑规则，将期望值改为 `{status_a_cnt}+1` 后保存并重新立即执行",
      "expected": "最新实例状态为校验异常，自定义 SQL 实际行数仍为 `{status_a_cnt}`"
    }
  ]
} as const;

test.describe("验证自定义 SQL 单表规则通过和不通过结果正确", () => {
  test("C0006 验证自定义 SQL 单表规则通过和不通过结果正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
