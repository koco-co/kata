// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0009",
  "title": "验证「date/datetime/time/timestamp类型」校验不通过功能",
  "steps": [
    {
      "action": "进入「资产-数据质量-规则任务配置-监控对象」页面",
      "expected": "页面正常打开"
    },
    {
      "action": "「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」",
      "expected": "监控对象配置成功； 进入「监控规则」配置页"
    },
    {
      "action": "「监控规则」配置如下：（4个字段组不全通过） 「监控规则」新增「时效性校验」 「字段」选择为「id」 「统计函数」选择「及时性校验（多字段时间差校验）」 「过滤条件」设置为「id<100」 1）「选择对比字段组1」为「create_date 1；create_date 2」。「时间差」选择为「<1天」。「大小关系」配置为「create_date 1<create_date 2」 2）「选择对比字段组2」为「update_datetime 1；update_datetime 2」。「时间差」选择为「>=1秒」。「大小关系」配置为「update_datetime 1<update_datetime 2」 3）「选择对比字段组3」为「work_time 1；work_time 2」。「时间差」选择为「>=1秒」。「大小关系」配置为「work_time 1<work_time 2」 4）「选择对比字段组4」为「sync_timestamp 1；sync_timestamp 2」。「时间差」选择为「>=1秒」。「大小关系」配置为「sync_timestamp 1<sync_timestamp 2」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」",
      "expected": "监控规则配置完成； 进入「调度属性」页面"
    },
    {
      "action": "配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果",
      "expected": "规则保存成功"
    },
    {
      "action": "临时运行规则，查看实例详情及质量报告",
      "expected": "实例运行结果为不通过，且实例详情展示正确，质量报告展示正确"
    }
  ]
} as const;

test.describe("验证「date/datetime/time/timestamp类型」校验不通过功能", () => {
  test("C0009 验证「date/datetime/time/timestamp类型」校验不通过功能", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
