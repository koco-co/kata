// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1118",
  "title": "验证【数据质量 规则集管理 表单校验】取值范围设置期望值已填写但操作符未选择时点击保存提示校验错误",
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
      "action": "在当前规则配置表单中按顺序填写如下：\n- *字段: score\n-*取值范围行-期望值: 输入 5\n- *取值范围行-操作符: 保持默认空选项（不选择任何操作符）\n-*枚举值行-枚举值类型: 选择 in\n- *枚举值行-枚举值信息: 依次输入 1、2、3\n-*条件关系: 选择【且】\n- 强弱规则: 强规则\n- 过滤条件: 无\n- 规则描述: 无",
      "expected": "*字段下拉框显示已选中 score，取值范围期望值显示 5、操作符未选择，枚举值类型显示 in、枚举值信息显示 1、2、3，条件关系显示「且」"
    },
    {
      "action": "点击【保存】按钮",
      "expected": "保存失败，页面在取值范围设置操作符位置展示红色校验错误提示「请选择操作符」，规则未被保存"
    }
  ]
} as const;

test.describe("验证【数据质量 规则集管理 表单校验】取值范围设置期望值已填写但操作符未选择时点击保存提示校验错误", () => {
  test("C1118 验证【数据质量 规则集管理 表单校验】取值范围设置期望值已填写但操作符未选择时点击保存提示校验错误", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
