// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0620",
  "title": "验证「内置规则」-「一致性校验」-「多表数据一致性比对」-「比对规则」内容正确",
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
      "action": "正确配置「监控规则」，点击「比对细节设置」按钮",
      "expected": "弹出「比对规则」内容配置"
    },
    {
      "action": "查看「比对规则」内容",
      "expected": "可勾选：\n1）数值差异百分比，对比表之间的数值型数据时，差距百分比小于等于xx%时候，计为成功匹配\n2）数值差异绝对值，对比表之间的数值型数据时，差距绝对值小于等于xx时候，计为成功匹配\n3）数值对比忽略小数点，忽略小数点后xx位\n4）字符不区分大小写，对比左右表的字符串型数据时，不区分大小写\n5）空值与NULL等价，对比左右表的数据时，认为空值与NULL值是相等的"
    },
    {
      "action": "鼠标hover\"？\"",
      "expected": "悬浮提示：\"若不勾选配置具体规则细节，则正常按照主键校验数据是否存在差异，只要存在差异判断校验不通过。\""
    }
  ]
} as const;

test.describe("验证「内置规则」-「一致性校验」-「多表数据一致性比对」-「比对规则」内容正确", () => {
  test("C0620 验证「内置规则」-「一致性校验」-「多表数据一致性比对」-「比对规则」内容正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
