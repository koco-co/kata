// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C009",
  "title": "验证规范性数值范围和枚举类规则结果正确",
  "steps": [
    {
      "action": "进入【数据质量 → 规则任务配置】页面，点击【新建监控规则】，等待监控对象页面加载完成",
      "expected": "进入新建单表校验规则流程"
    },
    {
      "action": "输入规则名称“v63规范性数值枚举任务”",
      "expected": "规则名称输入框展示“v63规范性数值枚举任务”"
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
      "expected": "监控对象配置完成，数据预览区域可查看 age、gender、user_type 字段"
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
      "action": "规则类型选择【规范性校验】，字段选择 age，在【统计规则】第 1 行选择【数值-取值范围】",
      "expected": "统计规则行切换为取值范围输入形态，展示左边界操作符、左边界值、字段间关系、右边界操作符、右边界值和过滤条件"
    },
    {
      "action": "左边界操作符选择【>=】并输入 `0`，字段间关系选择【AND】，右边界操作符选择【<=】并输入 `120`，过滤条件保持为空，强弱规则选择【弱规则】，规则描述填写“age 范围需在 0 到 120”，点击【保存】，等待规则卡片保存完成",
      "expected": "规则卡片展示字段 age，统计规则为数值-取值范围，范围条件为 `age >= 0 AND age <= 120`"
    },
    {
      "action": "点击【添加规则】，等待规则编辑表单加载完成",
      "expected": "新增【规范性校验】规则卡片展示为空白可编辑状态"
    },
    {
      "action": "字段选择 gender，在【统计规则】第 1 行选择【数值-枚举范围】",
      "expected": "统计规则行展示【期望值】配置区，期望值类型下拉包含【固定值】【占比】，操作符下拉展示 `=`、`!=`"
    },
    {
      "action": "期望值类型选择【固定值】，操作符选择【=】，数值输入 `0,1,2`，过滤条件保持为空，强弱规则选择【弱规则】，规则描述填写“gender 只能为 0、1、2”，点击【保存】，等待规则卡片保存完成",
      "expected": "规则卡片展示字段 gender，统计规则为数值-枚举范围，枚举范围值为 `0,1,2`"
    },
    {
      "action": "点击【添加规则】，等待规则编辑表单加载完成",
      "expected": "新增【规范性校验】规则卡片展示为空白可编辑状态"
    },
    {
      "action": "字段选择 user_type，在【统计规则】第 1 行选择【数值-枚举个数】，【期望值】类型选择【固定值】，操作符选择【=】，数值输入 `{user_type_enum_cnt}`，过滤条件保持为空，点击【保存】，等待规则卡片保存完成",
      "expected": "规则卡片展示字段 user_type，统计规则为数值-枚举个数，期望值为固定值等于 `{user_type_enum_cnt}`"
    },
    {
      "action": "点击【添加规则】，等待规则编辑表单加载完成",
      "expected": "新增【规范性校验】规则卡片展示为空白可编辑状态"
    },
    {
      "action": "字段选择 user_type，在【统计规则】第 1 行选择【枚举值信息】",
      "expected": "统计规则行展示枚举值信息输入框，支持以标签形式录入多个枚举值"
    },
    {
      "action": "在枚举值信息输入框中录入枚举值字符串 `VIP,NORMAL,GUEST`",
      "expected": "枚举值信息输入框展示已录入的枚举值字符串 `VIP,NORMAL,GUEST`"
    },
    {
      "action": "过滤条件保持为空，强弱规则选择【弱规则】，规则描述填写“user_type 只能为 VIP/NORMAL/GUEST”，点击【保存】，等待规则列表刷新完成",
      "expected": "规则列表展示 age 数值-取值范围、gender 数值-枚举范围、user_type 数值-枚举个数、user_type 枚举值信息四条规范性规则"
    },
    {
      "action": "进入调度属性，实例生成方式选择【立即生成】，点击【保存】并等待任务列表刷新完成",
      "expected": "任务“v63规范性数值枚举任务”创建成功"
    },
    {
      "action": "点击【立即执行】，等待任务实例查询生成最新实例",
      "expected": "最新实例生成后，age 越界明细数等于 `{age_range_invalid_cnt}`，gender 非 `0/1/2` 明细数等于 `{gender_enum_invalid_cnt}`，user_type 枚举个数等于 `{user_type_enum_cnt}`，user_type 非枚举值明细数等于 `{user_type_enum_invalid_cnt}`"
    }
  ]
} as const;

test.describe("验证规范性数值范围和枚举类规则结果正确", () => {
  test("C009 验证规范性数值范围和枚举类规则结果正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
