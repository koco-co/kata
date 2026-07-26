// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C626",
  "title": "验证「监控规则」-「一致性校验」-「多表数据一致性比对」任务通过结果详情正确",
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
      "action": "临时运行规则",
      "expected": "实例运行结果符合预期"
    },
    {
      "action": "查看实例详情",
      "expected": "抽屉式展开详情，页面包含：\n任务名称、监控报告tab、表级报告tab"
    },
    {
      "action": "点击【监控报告】tab",
      "expected": "包含「一致性校验」-「多表数据一致性比对」配置的详情、比对字段设置详情、比对规则详情（仅展示勾选的）"
    },
    {
      "action": "点击【表级报告】tab",
      "expected": "包含\n1）数据表信息汇总（表名、总分区数量、数据源、数据源类型、数据库），空白时显示\"--\"；\n2）表级统计（记录数、报警数），空白时显示\"--\"；\n3）最近30次综合报告（记录数平均波动率、平均记录数、日平均告警数、平均告警数）；\n4）最近30次表级统计；\n5）最近30次表数据波动图"
    }
  ]
} as const;

test.describe("验证「监控规则」-「一致性校验」-「多表数据一致性比对」任务通过结果详情正确", () => {
  test("C626 验证「监控规则」-「一致性校验」-「多表数据一致性比对」任务通过结果详情正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
