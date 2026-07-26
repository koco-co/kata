// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C005",
  "title": "验证唯一性单字段和多字段重复统计结果正确",
  "steps": [
    {
      "action": "进入【数据质量 → 规则任务配置】页面，点击【新建监控规则】，等待监控对象页面加载完成",
      "expected": "进入新建单表校验规则流程"
    },
    {
      "action": "输入规则名称“v63唯一性任务”",
      "expected": "规则名称输入框展示“v63唯一性任务”"
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
      "expected": "表单展示规则类型、字段、统计函数、校验方法、期望值配置项"
    },
    {
      "action": "选择规则类型【唯一性校验】，字段选择 nick_name",
      "expected": "统计函数根据单字段唯一性规则加载"
    },
    {
      "action": "统计函数选择【重复数】，校验方法选择固定值，操作符选择等于，期望值输入 `{nick_name_dup_cnt}`，点击【保存】，等待规则卡片保存完成",
      "expected": "规则卡片展示 nick_name 重复数、期望值等于 `{nick_name_dup_cnt}`"
    },
    {
      "action": "点击【添加规则】，等待规则编辑表单加载完成",
      "expected": "新增规则编辑表单展示为空白可编辑状态"
    },
    {
      "action": "选择唯一性校验，字段选择 nick_name，统计函数选择【重复率】，校验方法选择占比，期望值输入 `{nick_name_dup_rate}`，点击【保存】，等待规则列表刷新完成",
      "expected": "规则列表新增 nick_name 重复率规则，期望值等于 `{nick_name_dup_rate}`"
    },
    {
      "action": "点击【添加规则】，等待规则编辑表单加载完成",
      "expected": "新增规则编辑表单展示为空白可编辑状态"
    },
    {
      "action": "选择唯一性校验，字段同时选择 user_type 和 status",
      "expected": "多字段唯一性规则编辑区展示 user_type、status"
    },
    {
      "action": "统计函数选择【重复数】，校验方法选择固定值，操作符选择等于，期望值输入 `{user_type_status_dup_cnt}`，点击【保存】，等待规则列表刷新完成",
      "expected": "规则列表新增 user_type + status 多字段重复数规则"
    },
    {
      "action": "点击【添加规则】，等待规则编辑表单加载完成",
      "expected": "新增规则编辑表单展示为空白可编辑状态"
    },
    {
      "action": "选择唯一性校验，字段同时选择 user_type 和 status，统计函数选择【重复率】，校验方法选择占比，期望值输入 `{user_type_status_dup_rate}`，点击【保存】，等待规则列表刷新完成",
      "expected": "规则列表展示单字段重复数、单字段重复率、多字段重复数、多字段重复率 4 条规则"
    },
    {
      "action": "进入调度属性，实例生成方式选择【立即生成】，点击【保存】并等待任务列表刷新完成",
      "expected": "任务“v63唯一性任务”创建成功"
    },
    {
      "action": "点击【立即执行】，等待任务实例查询生成最新实例",
      "expected": "最新实例状态为校验通过，nick_name 与 user_type + status 的重复数、重复率实际值均等于执行前 SparkThrift 统计 SQL 的对应预期值"
    }
  ]
} as const;

test.describe("验证唯一性单字段和多字段重复统计结果正确", () => {
  test("C005 验证唯一性单字段和多字段重复统计结果正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
