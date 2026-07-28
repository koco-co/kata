// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0010",
  "title": "验证规范性身份证手机号邮箱格式规则结果正确",
  "steps": [
    {
      "action": "进入【数据质量 → 规则任务配置】页面，点击【新建监控规则】，等待监控对象页面加载完成",
      "expected": "进入新建单表校验规则流程"
    },
    {
      "action": "输入规则名称“v63规范性格式任务”",
      "expected": "规则名称输入框展示“v63规范性格式任务”"
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
      "expected": "监控对象配置完成，数据预览区域可查看 id_card_no、mobile_no、email 字段"
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
      "action": "规则类型选择【规范性校验】，字段选择 id_card_no，在【统计规则】第 1 行选择【格式-身份证号】",
      "expected": "统计规则行展示【期望值】配置区，期望值类型下拉包含【固定值】【占比】，操作符下拉展示 `>`、`>=`、`=`、`<`、`<=`、`!=`"
    },
    {
      "action": "期望值类型选择【固定值】，操作符选择【=】，数值输入 `{id_card_valid_cnt}`，过滤条件保持为空，强弱规则选择【弱规则】，规则描述填写“身份证号格式需符合 18 位身份证规则”，点击【保存】，等待规则卡片保存完成",
      "expected": "规则卡片展示字段 id_card_no，统计规则为格式-身份证号，期望值为固定值等于 `{id_card_valid_cnt}`"
    },
    {
      "action": "点击【添加规则】，等待规则编辑表单加载完成",
      "expected": "新增【规范性校验】规则卡片展示为空白可编辑状态"
    },
    {
      "action": "字段选择 mobile_no，在【统计规则】第 1 行选择【格式-手机号】，期望值类型选择【固定值】，操作符选择【=】，数值输入 `{mobile_valid_cnt}`，过滤条件保持为空，强弱规则选择【弱规则】，规则描述填写“手机号需符合 11 位手机号格式”，点击【保存】，等待规则卡片保存完成",
      "expected": "规则卡片展示字段 mobile_no，统计规则为格式-手机号，期望值为固定值等于 `{mobile_valid_cnt}`"
    },
    {
      "action": "点击【添加规则】，等待规则编辑表单加载完成",
      "expected": "新增【规范性校验】规则卡片展示为空白可编辑状态"
    },
    {
      "action": "字段选择 email，在【统计规则】第 1 行选择【格式-邮箱】，期望值类型选择【固定值】，操作符选择【=】，数值输入 `{email_valid_cnt}`，过滤条件保持为空，强弱规则选择【弱规则】，规则描述填写“邮箱需符合标准邮箱格式”，点击【保存】，等待规则列表刷新完成",
      "expected": "规则列表展示身份证号、手机号、邮箱三条格式规则，三条规则均为固定值校验"
    },
    {
      "action": "进入调度属性，实例生成方式选择【立即生成】，点击【保存】并等待任务列表刷新完成",
      "expected": "任务“v63规范性格式任务”创建成功"
    },
    {
      "action": "点击【立即执行】，等待任务实例查询生成最新实例",
      "expected": "最新实例生成后，身份证号、手机号、邮箱格式规则的符合格式数量分别等于 `{id_card_valid_cnt}`、`{mobile_valid_cnt}`、`{email_valid_cnt}`；不符合格式明细数分别等于 `{id_card_invalid_cnt}`、`{mobile_invalid_cnt}`、`{email_invalid_cnt}`"
    }
  ]
} as const;

test.describe("验证规范性身份证手机号邮箱格式规则结果正确", () => {
  test("C0010 验证规范性身份证手机号邮箱格式规则结果正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
