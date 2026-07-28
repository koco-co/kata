// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0058",
  "title": "验证编辑界面正常新增格式-日期格式-date校验规则",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】，选择任务date_01点击表名",
      "expected": "右侧弹出具体规则信息"
    },
    {
      "action": "点击添加规则-有效性校验",
      "expected": "展示有效性校验具体配置框"
    },
    {
      "action": "选择字段date_str\n统计规则选择格式-日期格式-date\n格式填写YYYY-MM-DD\n期望值选择\"固定值>=1\"\n其余选项为默认，点击保存",
      "expected": "校验保存成功"
    },
    {
      "action": "点击立即执行-进入校验结果查询",
      "expected": "校验完成后状态显示校验通过"
    }
  ]
} as const;

test.describe("验证编辑界面正常新增格式-日期格式-date校验规则", () => {
  test("C0058 验证编辑界面正常新增格式-日期格式-date校验规则", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
