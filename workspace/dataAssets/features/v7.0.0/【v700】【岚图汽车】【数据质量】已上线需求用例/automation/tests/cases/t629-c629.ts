// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C629",
  "title": "验证「监控规则」-「一致性校验」-「多表数据一致性比对」任务通过质量报告正确",
  "steps": [
    {
      "action": "进入「资产-【数据资产】-【数据质量】-【规则任务管理】-监控对象」页面",
      "expected": "页面正常打开"
    },
    {
      "action": "「规则名称」输入「test_rule」\n「选择数据源」选择「${DATASOURCE}」\n「选择数据库」选择「${DATABASE}」\n「选择数据表」选择「${TABLE}」",
      "expected": "监控对象配置成功；\n进入「监控规则」配置页"
    },
    {
      "action": "「监控规则」配置如下：\n「监控规则」新增「一致性校验」\n「校验类型」选择为「多表数据一致性比对」\n「选择校验字段」选择为「user_name；age」\n「选择校验表主键」选择为「id」\n「选择对比表」为「${TABLE}」\n「选择对比表主键」为「id」\n「比对字段设置」配置为「校验表-user_name-->对比表-user_name；校验表-age-->对比表-age」\n「强弱规则」选择「弱规则」\n「规则描述」输入「测试规则」\n不配置「对比细节设置」",
      "expected": "监控规则配置完成；\n进入「调度属性」页面"
    },
    {
      "action": "配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果",
      "expected": "规则保存成功"
    },
    {
      "action": "临时运行规则，查看质量报告",
      "expected": "页面包含：\n1）报告进入目录\n2）质量评估汇总区域\n3）规则校验明细区域"
    },
    {
      "action": "查看「质量评估汇总」区域",
      "expected": "显示为：\n1）规则名：「test_rule」\n2）数据源：「${DATASOURCE}」\n3）数据库：「${DATABASE}」\n4）检测数据范围：--\n5）表行数：「${表行数}」\n6）抽样行数：--\n7）字段数：「${字段数}」\n8）车辆数：「${车辆数}」\n9）校验规则数：1\n10）校验通过率：100%"
    },
    {
      "action": "查看「规则校验明细」区域",
      "expected": "显示为：\n1）规则类型：一致性校验\n2）规则名称：多表数据一致性校验\n3）字段名称：user_name;age\n4）字段类型：STRING;TINYINT\n5）质验结果：校验通过\n6）未通过原因：--\n7）详情说明：对比表为「${TABLE}」，校验字段的数据一致性符合规则\n8）最近一次校验结束时间：「${校验结束时间}」\n9）操作：--"
    }
  ]
} as const;

test.describe("验证「监控规则」-「一致性校验」-「多表数据一致性比对」任务通过质量报告正确", () => {
  test("C629 验证「监控规则」-「一致性校验」-「多表数据一致性比对」任务通过质量报告正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
