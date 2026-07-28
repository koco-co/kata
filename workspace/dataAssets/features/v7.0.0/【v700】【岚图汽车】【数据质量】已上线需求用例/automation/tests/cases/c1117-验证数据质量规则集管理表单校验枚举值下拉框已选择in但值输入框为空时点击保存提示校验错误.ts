// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1117",
  "title": "验证【数据质量 规则集管理 表单校验】枚举值下拉框已选择in但值输入框为空时点击保存提示校验错误",
  "steps": [
    {
      "action": "进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成",
      "expected": "规则集管理页面正常打开，列表显示已有规则集数据行"
    },
    {
      "action": "找到\"ruleset_15695_and\"，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在\"且关系校验包\"中点击【新增规则】，在统计函数下拉框中选择【取值范围&枚举范围】",
      "expected": "规则集编辑页 Step 2 打开，新增规则配置区域展开，统计函数显示「取值范围&枚举范围」"
    },
    {
      "action": "在当前规则配置表单中按顺序填写如下：\n- *字段: score\n-*取值范围行: 期望值输入 1，操作符选择 >\n- *枚举值行-枚举值类型: 选择 in\n-*枚举值行-枚举值信息: 留空不输入任何值\n- *条件关系: 选择【且】\n- 强弱规则: 强规则\n- 过滤条件: 无\n- 规则描述: 无",
      "expected": "*字段下拉框显示已选中 score，取值范围操作符显示 >、期望值显示 1，枚举值类型显示 in、枚举值信息为空，条件关系显示「且」"
    },
    {
      "action": "点击【保存】按钮",
      "expected": "保存失败，页面在枚举值信息输入框位置展示红色校验错误提示「请输入枚举值」，规则未被保存"
    }
  ]
} as const;

test.describe("验证【数据质量 规则集管理 表单校验】枚举值下拉框已选择in但值输入框为空时点击保存提示校验错误", () => {
  test("C1117 验证【数据质量 规则集管理 表单校验】枚举值下拉框已选择in但值输入框为空时点击保存提示校验错误", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
