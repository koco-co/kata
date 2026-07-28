// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0395",
  "title": "验证「内置规则」-「时效性」-「多字段时间差校验」-「字段类型异常」校验功能",
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
      "action": "「监控规则」配置如下：（6个字段组分别为int/varchar/string/decimal/boolean/double类型）\n「监控规则」新增「时效性校验」\n「字段」选择为「id」\n「统计函数」选择「及时性校验（多字段时间差校验）」\n「过滤条件」设置为「id<100」\n1）「选择对比字段组1」为「id1；id2」。「时间差」选择为「<1天」。「大小关系」配置为「id1<id2」\n2）「选择对比字段组2」为「user_name1；user_name2」。「时间差」选择为「>=1秒」。「大小关系」配置为「user_name1<user_name2」\n3）「选择对比字段组3」为「address1；address2」。「时间差」选择为「>=1秒」。「大小关系」配置为「address1<address2」\n4）「选择对比字段组4」为「salary1；salary2」。「时间差」选择为「>=1秒」。「大小关系」配置为「salary1<salary2」\n5）「选择对比字段组4」为「is_active1；is_active2」。「时间差」选择为「>=1秒」。「大小关系」配置为「is_active1<is_active2」\n6）「选择对比字段组4」为「total_amount1；total_amount2」。「时间差」选择为「>=1秒」。「大小关系」配置为「total_amount1<total_amount2」\n「强弱规则」选择「弱规则」\n「规则描述」输入「测试规则」",
      "expected": "仅支持配置时间日期型、string字段，监控规则配置完成；\n进入「调度属性」页面"
    },
    {
      "action": "配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果",
      "expected": "规则保存成功"
    },
    {
      "action": "立即执行规则",
      "expected": "运行失败，日志显示正确失败详情"
    }
  ]
} as const;

test.describe("验证「内置规则」-「时效性」-「多字段时间差校验」-「字段类型异常」校验功能", () => {
  test("C0395 验证「内置规则」-「时效性」-「多字段时间差校验」-「字段类型异常」校验功能", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
