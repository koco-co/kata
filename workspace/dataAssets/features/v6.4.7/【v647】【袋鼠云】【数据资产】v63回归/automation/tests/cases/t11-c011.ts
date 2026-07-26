// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C011",
  "title": "验证规范性字符串长度数据精度空值重复和枚举值规则结果正确",
  "steps": [
    {
      "action": "进入【数据质量 → 规则任务配置】页面，点击【新建监控规则】，等待监控对象页面加载完成",
      "expected": "进入新建单表校验规则流程"
    },
    {
      "action": "输入规则名称“v63规范性综合任务”",
      "expected": "规则名称输入框展示“v63规范性综合任务”"
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
      "expected": "监控对象配置完成，数据预览区域可查看 user_name、user_code、salary、remark、nick_name、status 字段"
    },
    {
      "action": "点击【下一步】，等待监控规则页面加载完成",
      "expected": "页面展示【添加规则】按钮"
    },
    {
      "action": "点击【添加规则】，等待规则编辑表单加载完成",
      "expected": "表单展示【规范性校验】卡片，包含【字段】【统计规则】【强弱规则】【规则描述】【保存】【取消】"
    },
    {
      "action": "规则类型选择【规范性校验】，字段选择 user_name，在【统计规则】第 1 行选择【字符串最大长度】",
      "expected": "统计规则行展示【期望值】配置区，期望值类型下拉包含【固定值】【占比】"
    },
    {
      "action": "期望值类型选择【固定值】，操作符选择【=】，数值输入 `{user_name_max_len}`，过滤条件保持为空，强弱规则选择【弱规则】，规则描述填写“user_name 最大长度等于统计值”，点击【保存】，等待规则卡片保存完成",
      "expected": "规则卡片展示字段 user_name，统计规则为字符串最大长度，期望值为固定值等于 `{user_name_max_len}`"
    },
    {
      "action": "点击【添加规则】，等待规则编辑表单加载完成",
      "expected": "新增【规范性校验】规则卡片展示为空白可编辑状态"
    },
    {
      "action": "字段选择 user_name，在【统计规则】第 1 行选择【字符串最小长度】，期望值类型选择【固定值】，操作符选择【=】，数值输入 `{user_name_min_len}`，过滤条件保持为空，点击【保存】，等待规则卡片保存完成",
      "expected": "规则卡片展示字段 user_name，统计规则为字符串最小长度，期望值为固定值等于 `{user_name_min_len}`"
    },
    {
      "action": "点击【添加规则】，等待规则编辑表单加载完成",
      "expected": "新增【规范性校验】规则卡片展示为空白可编辑状态"
    },
    {
      "action": "字段选择 user_code，在【统计规则】第 1 行选择【字符串长度】，期望值类型选择【固定值】，操作符选择【=】，数值输入 `11`，过滤条件保持为空，规则描述填写“user_code 长度固定为 11”，点击【保存】，等待规则卡片保存完成",
      "expected": "规则卡片展示字段 user_code，统计规则为字符串长度，期望长度为固定值等于 `11`"
    },
    {
      "action": "点击【添加规则】，等待规则编辑表单加载完成",
      "expected": "新增【规范性校验】规则卡片展示为空白可编辑状态"
    },
    {
      "action": "字段选择 salary，在【统计规则】第 1 行选择【数据精度】",
      "expected": "统计规则行切换为数据精度输入形态，展示【小数点前】操作符和值、AND/OR 关系、【小数点后】操作符和值"
    },
    {
      "action": "【小数点前】操作符选择【=】并输入 `10`，关系选择【且】，【小数点后】操作符选择【=】并输入 `2`，过滤条件保持为空，规则描述填写“salary 数据精度为小数点前 10 位、小数点后 2 位”，点击【保存】，等待规则卡片保存完成",
      "expected": "规则卡片展示字段 salary，统计规则为数据精度，精度条件为小数点前 `=10` 且小数点后 `=2`"
    },
    {
      "action": "点击【添加规则】，等待规则编辑表单加载完成",
      "expected": "新增【规范性校验】规则卡片展示为空白可编辑状态"
    },
    {
      "action": "字段选择 remark，在【统计规则】第 1 行选择【空值数】，期望值类型选择【固定值】，操作符选择【=】，数值输入 `{remark_null_cnt}`，过滤条件保持为空，点击【保存】，等待规则卡片保存完成",
      "expected": "规则卡片展示字段 remark，统计规则为空值数，期望值为固定值等于 `{remark_null_cnt}`"
    },
    {
      "action": "点击【添加规则】，等待规则编辑表单加载完成",
      "expected": "新增【规范性校验】规则卡片展示为空白可编辑状态"
    },
    {
      "action": "字段选择 nick_name，在【统计规则】第 1 行选择【重复数】，期望值类型选择【固定值】，操作符选择【=】，数值输入 `{nick_name_dup_cnt}`，过滤条件保持为空，点击【保存】，等待规则卡片保存完成",
      "expected": "规则卡片展示字段 nick_name，统计规则为重复数，期望值为固定值等于 `{nick_name_dup_cnt}`"
    },
    {
      "action": "点击【添加规则】，等待规则编辑表单加载完成",
      "expected": "新增【规范性校验】规则卡片展示为空白可编辑状态"
    },
    {
      "action": "字段选择 status，在【统计规则】第 1 行选择【枚举值】",
      "expected": "统计规则行展示枚举值信息输入框，支持以标签形式录入多个枚举值"
    },
    {
      "action": "在枚举值信息输入框中录入枚举值字符串 `A,I,D`",
      "expected": "枚举值信息输入框展示已录入的枚举值字符串 `A,I,D`"
    },
    {
      "action": "过滤条件保持为空，强弱规则选择【弱规则】，规则描述填写“status 只能为 A/I/D”，点击【保存】，等待规则列表刷新完成",
      "expected": "规则列表展示最大字符串长度、最小字符串长度、固定字符串长度、数据精度、空值数、重复数、枚举值信息规则"
    },
    {
      "action": "进入调度属性，实例生成方式选择【立即生成】，点击【保存】并等待任务列表刷新完成",
      "expected": "任务“v63规范性综合任务”创建成功"
    },
    {
      "action": "点击【立即执行】，等待任务实例查询生成最新实例",
      "expected": "最新实例生成后，user_name 最大/最小长度、remark 空值数、nick_name 重复数与执行前 SparkThrift 统计 SQL 一致；user_code 长度不符合明细数等于 `{user_code_fixed_len_invalid_cnt}`；status 非 `A/I/D` 明细数等于 `{status_enum_invalid_cnt}`"
    }
  ]
} as const;

test.describe("验证规范性字符串长度数据精度空值重复和枚举值规则结果正确", () => {
  test("C011 验证规范性字符串长度数据精度空值重复和枚举值规则结果正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
