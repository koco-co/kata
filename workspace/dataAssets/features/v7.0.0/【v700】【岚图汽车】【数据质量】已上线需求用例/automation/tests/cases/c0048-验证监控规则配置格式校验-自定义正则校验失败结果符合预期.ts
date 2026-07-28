// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0048",
  "title": "验证监控规则配置格式校验-自定义正则校验失败结果符合预期",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】-单表校验规则",
      "expected": "进入监控对象界面"
    },
    {
      "action": "输入\n规则名称：正则_02\n选择数据源：已有数据源\n选择数据库：已有数据库\n选择数据表：已有数据表\n点击下一步",
      "expected": "进入监控规则界面"
    },
    {
      "action": "点击添加多个规则-有效性校验",
      "expected": "展示有效性校验具体配置框"
    },
    {
      "action": "分别选择字段pos_int、decimal_2、alnum_only、username、email、phone、date_yyyy_mm_dd\n统计规则选择格式校验-自定义正则\n选择规则分别选择规则01-07\n期望值选择\"固定值<=1\"\n其余选项为默认，点击保存、下一步",
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
      "expected": "实例状态显示校验异常\n提示校验不通过：7"
    }
  ]
} as const;

test.describe("验证监控规则配置格式校验-自定义正则校验失败结果符合预期", () => {
  test("C0048 验证监控规则配置格式校验-自定义正则校验失败结果符合预期", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
