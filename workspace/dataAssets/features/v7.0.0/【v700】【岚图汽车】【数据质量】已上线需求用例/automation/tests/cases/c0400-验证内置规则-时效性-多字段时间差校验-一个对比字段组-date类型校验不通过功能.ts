// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0400",
  "title": "验证「内置规则」-「时效性」-「多字段时间差校验」-「一个对比字段组」-「date类型」校验不通过功能",
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
      "action": "「监控规则」配置如下：\n「监控规则」新增「时效性校验」\n「字段」选择为「id」\n「统计函数」选择「及时性校验（多字段时间差校验）」\n「过滤条件」设置为「id<100」\n「选择对比字段组」为「create_date 1；create_date 2」\n「时间差」选择为「<1天」\n「大小关系」配置为「create_date 1<create_date 2」\n「强弱规则」选择「弱规则」\n「规则描述」输入「测试规则」",
      "expected": "监控规则配置完成；\n进入「调度属性」页面"
    },
    {
      "action": "配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果",
      "expected": "规则保存成功"
    },
    {
      "action": "临时运行规则，查看实例详情及质量报告",
      "expected": "实例运行结果符合预期，且实例详情展示正确，质量报告展示正确"
    }
  ]
} as const;

test.describe("验证「内置规则」-「时效性」-「多字段时间差校验」-「一个对比字段组」-「date类型」校验不通过功能", () => {
  test("C0400 验证「内置规则」-「时效性」-「多字段时间差校验」-「一个对比字段组」-「date类型」校验不通过功能", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
