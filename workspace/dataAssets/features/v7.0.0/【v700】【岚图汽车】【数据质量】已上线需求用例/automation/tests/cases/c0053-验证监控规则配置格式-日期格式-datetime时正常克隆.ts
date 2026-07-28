// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0053",
  "title": "验证监控规则配置格式-日期格式-datetime时正常克隆",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】-单表校验规则",
      "expected": "进入监控对象界面"
    },
    {
      "action": "输入\n规则名称：datetime_02\n选择数据源：已有数据源\n选择数据库：已有数据库\n选择数据表：已有数据表\n点击下一步",
      "expected": "进入监控规则界面"
    },
    {
      "action": "点击添加多个规则-有效性校验",
      "expected": "展示有效性校验具体配置框"
    },
    {
      "action": "选择字段datetime_str\n统计规则选择格式-日期格式-datetime\n格式分别填写YYYY-MM-DDThh:mm:ss、YYYY-MM-DDThh:mm:ss±hh:mm、MM/DD/YYYY hh:mm:ss AM/PM、MM/DD/YYYY HH:mm:ss、DD.MM.YYYY hh:mm:ss、YY-MM-DD hh:mm:ss、YYYY/MM/DD hh:mm:ss\n期望值选择\"固定值>=1\"\n其余选项为默认，点击保存，点击保存\n选择其中一个校验框点击右上角克隆",
      "expected": "新增一个校验框，内容配置与克隆源完全一致"
    },
    {
      "action": "点击下一步",
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

test.describe("验证监控规则配置格式-日期格式-datetime时正常克隆", () => {
  test("C0053 验证监控规则配置格式-日期格式-datetime时正常克隆", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
