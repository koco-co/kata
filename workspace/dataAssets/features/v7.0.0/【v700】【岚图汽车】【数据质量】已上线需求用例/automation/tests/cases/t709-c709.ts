// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C709",
  "title": "验证「数据质量」-「数据质量报告」详情-明细数据支持下载1万条数据",
  "steps": [
    {
      "action": "进入「数据质量」-「规则任务管理」-「监控对象」页面",
      "expected": "进入成功"
    },
    {
      "action": "「规则名称」输入「test_rule」「选择数据源」选择「${DATASOURCE}」「选择数据库」选择「${DATABASE}」「选择数据表」选择「${TABLE}」",
      "expected": "监控对象配置成功"
    },
    {
      "action": "「监控规则」新增「有效性校验」「字段」选择「score」「统计函数」选择「数值取值范围」「期望值」为「score > 150」「过滤条件」设置为「id != 100」「强弱规则」选择为「弱规则」「规则描述」输入「测试规则」",
      "expected": "监控规则配置完成"
    },
    {
      "action": "配置「调度属性」，配置「规则报告」，保存规则",
      "expected": "规则保存成功"
    },
    {
      "action": "临时运行规则",
      "expected": "规则校验失败"
    },
    {
      "action": "第二天查看报告详情，下载明细数据",
      "expected": "成功下载脏数据前1w条数据"
    }
  ]
} as const;

test.describe("验证「数据质量」-「数据质量报告」详情-明细数据支持下载1万条数据", () => {
  test("C709 验证「数据质量」-「数据质量报告」详情-明细数据支持下载1万条数据", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
