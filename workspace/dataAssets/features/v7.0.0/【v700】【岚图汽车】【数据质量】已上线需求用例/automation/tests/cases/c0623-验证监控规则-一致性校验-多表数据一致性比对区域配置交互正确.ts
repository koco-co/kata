// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0623",
  "title": "验证「监控规则」-「一致性校验」-「多表数据一致性比对」区域配置交互正确",
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
      "action": "点击【添加规则】按钮，选择「一致性校验」规则",
      "expected": "选择成功，页面显示「一致性校验」规则配置区域"
    },
    {
      "action": "查看「选择校验字段」的\"？\"",
      "expected": "悬浮提示\"若不选择校验字段则只判断主键的一致性\""
    },
    {
      "action": "查看「选择校验字段」",
      "expected": "非必填，可多选"
    },
    {
      "action": "查看「选择校验表主键」",
      "expected": "必填，可多选"
    },
    {
      "action": "查看「选择对比表主键」",
      "expected": "必填，可多选"
    },
    {
      "action": "不配置「选择校验字段」",
      "expected": "下方不显示「比对字段设置」列表"
    }
  ]
} as const;

test.describe("验证「监控规则」-「一致性校验」-「多表数据一致性比对」区域配置交互正确", () => {
  test("C0623 验证「监控规则」-「一致性校验」-「多表数据一致性比对」区域配置交互正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
