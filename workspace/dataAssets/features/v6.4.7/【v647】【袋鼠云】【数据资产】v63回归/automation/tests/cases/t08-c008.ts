// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C008",
  "title": "验证 string 数字字段强转 int 后各类规则结果正确",
  "steps": [
    {
      "action": "进入【数据质量 → 规则任务配置】页面，点击【新建监控规则】，等待监控对象页面加载完成",
      "expected": "进入新建单表校验规则流程"
    },
    {
      "action": "输入规则名称“v63 string强转int专项任务”",
      "expected": "规则名称输入框展示“v63 string强转int专项任务”"
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
      "action": "选择数据表 dq_test_string_cast_int",
      "expected": "监控对象配置完成，数据预览区域可查看 age_str、score_str、enum_num_str、unique_num_str 字段，字段类型均为 string"
    },
    {
      "action": "点击【下一步】，等待监控规则页面加载完成",
      "expected": "页面展示【添加规则】按钮"
    },
    {
      "action": "点击【添加规则】，选择规则类型【完整性校验】，规则类型选择【字段级】，字段选择 age_str",
      "expected": "规则编辑表单展示字段 age_str 和完整性统计规则配置区域"
    },
    {
      "action": "统计函数选择【空值数】，校验方法选择固定值，操作符选择等于，期望值输入 `{age_str_null_cnt}`，强弱规则选择强规则，点击【保存】，等待规则卡片保存完成",
      "expected": "规则卡片展示 age_str 空值数，期望值等于 `{age_str_null_cnt}`"
    },
    {
      "action": "点击【添加规则】，选择完整性校验字段级，字段选择 age_str，统计函数选择【空值率】，校验方法选择占比，操作符选择等于，期望值输入 `{age_str_null_rate}`，点击【保存】，等待规则列表刷新完成",
      "expected": "规则列表新增 age_str 空值率规则，期望值等于 `{age_str_null_rate}`"
    },
    {
      "action": "点击【添加规则】，选择规则类型【准确性校验】，字段选择 score_str",
      "expected": "准确性统计函数下拉框加载完成，score_str 作为 string 类型数字字段可配置数值类统计函数"
    },
    {
      "action": "在同一规则中依次添加统计函数【求和】等于 `{score_str_sum}`、【求平均】等于 `{score_str_avg}`、【负值比】等于 `{score_str_negative_rate}`、【零值比】等于 `{score_str_zero_rate}`、【正值比】等于 `{score_str_positive_rate}`，点击【保存】",
      "expected": "规则卡片展示 score_str 的 5 条准确性统计配置，字段类型为 string，统计口径按 int 强转后的数值计算"
    },
    {
      "action": "点击【添加规则】，选择规则类型【规范性校验】，字段选择 age_str，在【统计规则】第 1 行选择【数值-取值范围】",
      "expected": "统计规则行切换为取值范围输入形态"
    },
    {
      "action": "左边界操作符选择【>=】并输入 `0`，字段间关系选择【AND】，右边界操作符选择【<=】并输入 `120`，过滤条件保持为空，规则描述填写“age_str 强转 int 后范围需在 0 到 120”，点击【保存】",
      "expected": "规则卡片展示字段 age_str，统计规则为数值-取值范围，范围条件为 `age_str >= 0 AND age_str <= 120`"
    },
    {
      "action": "点击【添加规则】，选择规范性校验，字段选择 enum_num_str，在【统计规则】第 1 行选择【数值-枚举范围】",
      "expected": "统计规则行展示数值枚举范围配置区"
    },
    {
      "action": "期望值类型选择【固定值】，操作符选择【=】，数值输入 `0,1,2`，过滤条件保持为空，规则描述填写“enum_num_str 强转 int 后只能为 0、1、2”，点击【保存】",
      "expected": "规则卡片展示字段 enum_num_str，统计规则为数值-枚举范围，枚举范围值为 `0,1,2`"
    },
    {
      "action": "点击【添加规则】，选择规范性校验，字段选择 enum_num_str，在【统计规则】第 1 行选择【数值-枚举个数】，期望值类型选择【固定值】，操作符选择【=】，数值输入 `{enum_num_str_enum_cnt}`，点击【保存】",
      "expected": "规则卡片展示字段 enum_num_str，统计规则为数值-枚举个数，期望值等于 `{enum_num_str_enum_cnt}`"
    },
    {
      "action": "点击【添加规则】，选择规范性校验，字段选择 age_str，在【统计规则】第 1 行选择【空值数】，期望值类型选择【固定值】，操作符选择【=】，数值输入 `{age_str_null_cnt}`，点击【保存】",
      "expected": "规则卡片展示 age_str 规范性空值数，期望值等于 `{age_str_null_cnt}`"
    },
    {
      "action": "点击【添加规则】，选择规范性校验，字段选择 unique_num_str，在【统计规则】第 1 行选择【重复数】，期望值类型选择【固定值】，操作符选择【=】，数值输入 `{unique_num_str_dup_cnt}`，点击【保存】",
      "expected": "规则卡片展示 unique_num_str 规范性重复数，期望值等于 `{unique_num_str_dup_cnt}`"
    },
    {
      "action": "点击【添加规则】，选择规范性校验，字段选择 enum_num_str，在【统计规则】第 1 行选择【枚举值】",
      "expected": "统计规则行展示枚举值信息输入框"
    },
    {
      "action": "在枚举值信息输入框中录入枚举值字符串 `0,1,2`，过滤条件保持为空，规则描述填写“enum_num_str 强转 int 后枚举值限定为 0/1/2”，点击【保存】",
      "expected": "规则列表展示 enum_num_str 枚举值信息规则"
    },
    {
      "action": "点击【添加规则】，选择规则类型【唯一性校验】，字段选择 unique_num_str，统计函数选择【重复数】，校验方法选择固定值，操作符选择等于，期望值输入 `{unique_num_str_dup_cnt}`，点击【保存】",
      "expected": "规则卡片展示 unique_num_str 唯一性重复数，期望值等于 `{unique_num_str_dup_cnt}`"
    },
    {
      "action": "点击【添加规则】，选择唯一性校验，字段选择 unique_num_str，统计函数选择【重复率】，校验方法选择占比，操作符选择等于，期望值输入 `{unique_num_str_dup_rate}`，点击【保存】",
      "expected": "规则列表新增 unique_num_str 唯一性重复率规则，期望值等于 `{unique_num_str_dup_rate}`"
    },
    {
      "action": "点击【添加规则】，选择唯一性校验，字段选择 unique_num_str，统计函数选择【非重复个数】，校验方法选择固定值，操作符选择等于，期望值输入 `{unique_num_str_non_dup_cnt}`，点击【保存】",
      "expected": "规则列表新增 unique_num_str 非重复个数规则，期望值等于 `{unique_num_str_non_dup_cnt}`"
    },
    {
      "action": "点击【添加规则】，选择唯一性校验，字段选择 unique_num_str，统计函数选择【非重复占比】，校验方法选择占比，操作符选择等于，期望值输入 `{unique_num_str_non_dup_rate}`，点击【保存】",
      "expected": "规则列表新增 unique_num_str 非重复占比规则，期望值等于 `{unique_num_str_non_dup_rate}`"
    },
    {
      "action": "点击【添加规则】，选择规则类型【自定义SQL】，输入 SQL：`SELECT id FROM dq_test_string_cast_int WHERE CAST(score_str AS INT) > 0`",
      "expected": "SQL 输入框展示完整 SQL，语句使用 string 类型 score_str 强转 int 后进行数值过滤"
    },
    {
      "action": "校验方法选择固定值，操作符选择等于，期望值输入 `{score_str_positive_cnt}`，强弱规则选择强规则，点击【保存】，等待规则卡片保存完成",
      "expected": "规则卡片展示自定义 SQL、期望值等于 `{score_str_positive_cnt}`"
    },
    {
      "action": "进入调度属性，实例生成方式选择【立即生成】，点击【保存】并等待任务列表刷新完成",
      "expected": "任务“v63 string强转int专项任务”创建成功"
    },
    {
      "action": "点击【立即执行】，等待任务实例查询生成最新实例",
      "expected": "最新实例状态为校验通过，完整性、准确性、规范性、唯一性和自定义 SQL 中的 string 数字字段强转 int 规则实际值均等于执行前 SparkThrift 统计 SQL 的对应预期值"
    },
    {
      "action": "打开实例详情，查看规范性和自定义 SQL 规则明细",
      "expected": "age_str 数值范围不通过明细数等于 `{age_str_range_invalid_cnt}`；enum_num_str 非 `0/1/2` 明细数等于 `{enum_num_str_enum_invalid_cnt}`；自定义 SQL 明细查询结果行数等于 `{score_str_positive_cnt}`"
    }
  ]
} as const;

test.describe("验证 string 数字字段强转 int 后各类规则结果正确", () => {
  test("C008 验证 string 数字字段强转 int 后各类规则结果正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
