// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0075",
  "title": "验证监控规则配置IQR离群点占比时表校验正常",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】-单表校验规则",
      "expected": "进入监控对象界面"
    },
    {
      "action": "输入\n规则名称：liqunbi_01\n选择数据源：已有数据源\n选择数据库：已有数据库\n选择数据表：已有数据表\n点击下一步",
      "expected": "进入监控规则界面"
    },
    {
      "action": "点击添加多个规则-统计性校验",
      "expected": "展示统计性校验具体配置框"
    },
    {
      "action": "分别选择字段col_tiny, col_small, col_medium, col_int, col_big, col_float, col_double, col_decimal\n校验方法选择IQR离群点占比\n期望值选择\"=50\"\n其余选项为默认，点击保存、下一步",
      "expected": "进入调度属性配置界面"
    },
    {
      "action": "选项均为默认，点击新建",
      "expected": "提示规则新建成功"
    },
    {
      "action": "点击所建规则查看详细信息",
      "expected": "基本信息、监控规则内容符合预期"
    },
    {
      "action": "点击立即执行-进入校验结果查询",
      "expected": "校验完成后状态显示校验通过"
    }
  ]
} as const;

test.describe("验证监控规则配置IQR离群点占比时表校验正常", () => {
  test("C0075 验证监控规则配置IQR离群点占比时表校验正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
