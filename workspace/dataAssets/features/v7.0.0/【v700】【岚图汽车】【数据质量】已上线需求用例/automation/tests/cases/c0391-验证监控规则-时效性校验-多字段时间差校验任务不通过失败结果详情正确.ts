// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0391",
  "title": "验证「监控规则」-「时效性校验」-「多字段时间差校验」任务不通过/失败结果详情正确",
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
      "action": "「监控规则」配置如下：\n「监控规则」新增「时效性校验」\n「字段」选择为「id」\n「统计函数」选择「及时性校验（多字段时间差校验）」\n「过滤条件」设置为「id<100」\n「选择对比字段组」为「order_date1；order_date2」\n「时间差」选择为「<=1秒」\n「大小关系」配置为「order_date1>order_date2」\n「强弱规则」选择「弱规则」\n「规则描述」输入「测试规则」",
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
      "action": "查看不通过的实例详情",
      "expected": "抽屉式展开详情，页面包含：\n任务名称、监控报告tab、表级报告tab"
    },
    {
      "action": "点击【监控报告】tab",
      "expected": "1）都展示「时效性校验」-「多字段时间差校验」配置的详情；\n2）校验未通过的规则支持查看明细"
    },
    {
      "action": "点击查看明细",
      "expected": "1）标题显示为\"查看\"及时性校验-多字段时间差校验\"明细\"\n2）记录不符合时间差内的数据，列表为全部列数据，配置的校验字段标红展示"
    },
    {
      "action": "点击【下载明细】按钮",
      "expected": "支持下载明细，内容正确"
    },
    {
      "action": "点击【表级报告】tab",
      "expected": "包含：\n1）数据表信息汇总（表名、总分区数量、数据源、数据源类型、数据库），空白时显示\"--\"；\n2）表级统计（记录数、报警数），空白时显示\"--\"；\n3）最近30次综合报告（记录数平均波动率、平均记录数、日平均告警数、平均告警数）；\n4）最近30次表级统计；\n5）最近30次表数据波动图"
    },
    {
      "action": "查看运行失败的示例详情",
      "expected": "1）展示「时效性校验」-「多字段时间差校验」配置的详情；\n2）运行失败的规则支持查看日志"
    }
  ]
} as const;

test.describe("验证「监控规则」-「时效性校验」-「多字段时间差校验」任务不通过/失败结果详情正确", () => {
  test("C0391 验证「监控规则」-「时效性校验」-「多字段时间差校验」任务不通过/失败结果详情正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
