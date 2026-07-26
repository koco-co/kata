// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C007",
  "title": "验证「string转long」校验不通过功能",
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
      "action": "「监控规则」配置如下： 「监控规则」新增「时效性校验」 「字段」选择为「id」 「统计函数」选择「及时性校验（多字段时间差校验）」 「过滤条件」设置为「id<100」 「选择对比字段组」为「date_str_ymd_hms_ms1；date_str_ymd_hms_ms2」。「时间差」选择为「<1天」。「大小关系」配置为「date_str_ymd_hms_ms1<date_str_ymd_hms_ms2」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」",
      "expected": "监控规则配置完成； 进入「调度属性」页面"
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

test.describe("验证「string转long」校验不通过功能", () => {
  test("C007 验证「string转long」校验不通过功能", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
