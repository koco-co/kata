// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0615",
  "title": "验证「内置规则」-「一致性校验」-「多表数据一致性比对」-「一个对比表」校验不通过功能",
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
      "action": "「监控规则」配置如下：\n「监控规则」新增「一致性校验」\n「校验类型」选择为「多表数据一致性比对」\n「选择校验字段」选择为「user_name；age」\n「选择校验表主键」选择为「id」\n「选择对比表」为「${TABLE}」\n「选择对比表主键」为「id」\n「比对字段设置」配置为「校验表-user_name-->对比表-age；校验表-age-->对比表-name」\n「强弱规则」选择「弱规则」\n「规则描述」输入「测试规则」\n不配置「对比细节设置」",
      "expected": "监控规则配置完成；\n进入「调度属性」页面"
    },
    {
      "action": "配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果",
      "expected": "规则保存成功"
    },
    {
      "action": "临时运行规则，查看实例详情及质量报告",
      "expected": "实例运行结果不通过，且实例详情展示正确，质量报告展示正确"
    }
  ]
} as const;

test.describe("验证「内置规则」-「一致性校验」-「多表数据一致性比对」-「一个对比表」校验不通过功能", () => {
  test("C0615 验证「内置规则」-「一致性校验」-「多表数据一致性比对」-「一个对比表」校验不通过功能", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
