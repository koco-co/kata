// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0077",
  "title": "验证编辑界面正常新增IQR离群点数量校验规则",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】，选择任务liqun_01点击表名",
      "expected": "右侧弹出具体规则信息"
    },
    {
      "action": "点击添加规则-统计性校验",
      "expected": "展示统计性校验具体配置框"
    },
    {
      "action": "选择字段col_tiny\n校验方法选择IQR离群点数量\n期望值选择\"=5\"\n其余选项为默认，点击保存",
      "expected": "校验保存成功"
    },
    {
      "action": "点击立即执行-进入校验结果查询",
      "expected": "校验完成后状态显示校验通过"
    }
  ]
} as const;

test.describe("验证编辑界面正常新增IQR离群点数量校验规则", () => {
  test("C0077 验证编辑界面正常新增IQR离群点数量校验规则", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
