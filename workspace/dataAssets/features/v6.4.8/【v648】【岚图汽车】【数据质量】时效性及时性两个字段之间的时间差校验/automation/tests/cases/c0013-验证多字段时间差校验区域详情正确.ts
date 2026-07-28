// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0013",
  "title": "验证「多字段时间差校验」区域详情正确",
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
      "action": "点击【添加规则】按钮，选择「时效性校验」规则",
      "expected": "选择成功，页面显示「时效性校验」规则配置区域"
    },
    {
      "action": "查看配置区域详情",
      "expected": "包含： 1）「字段」，可选择对应数据表下的所有字段 2）「统计函数」，可选择「及时性校验（多字段时间差校验）」 3）「过滤条件」，可选择「选项配置」、「手动配置」 4）「选择对比字段组」，选择对应数据表下的所有字段，可配置多个对比字段组 5）「时间差」，可配置「>/</>=/<=/=/!= xx 毫秒/秒/分钟/小时/天」 6）「大小关系」，可配置字段1 >/< 字段2 7）可对「对比字段组」进行新增删除操作 8）「强弱规则」，可选择「强/弱规则」 9）「规则描述」，可输入内容 10）「保存」和「取消」按钮"
    }
  ]
} as const;

test.describe("验证「多字段时间差校验」区域详情正确", () => {
  test("C0013 验证「多字段时间差校验」区域详情正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
