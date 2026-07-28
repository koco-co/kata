// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0095",
  "title": "验证「规则任务管理」中 Doris 3.x 数据源规则任务的编辑功能正常",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "选择规则${rule}, 点击「编辑」",
      "expected": "进入编辑页面的「监控对象」部分1) 配置项回显内容为${最近保存的数据}2)支持修改规则名称3) 数据源/库/表呈现置灰状态, 不支持修改"
    },
    {
      "action": "点击「下一步」",
      "expected": "进入编辑页面的「监控规则」部分1) 配置项回显内容为${最近保存的数据}2)所有选项均支持修改"
    },
    {
      "action": "编辑「完整性校验」规则:「校验类型」选择「单表」「统计函数」 选择「表行数」「过滤条件」 无「校验方法」选择「固定值」「期望值」选择「<5」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」",
      "expected": "配置完成"
    },
    {
      "action": "点击「保存」按钮",
      "expected": "规则配置保存正确"
    },
    {
      "action": "点击「下一步」, 点击「完成」",
      "expected": "规则编辑成功"
    },
    {
      "action": "立即运行、周期运行",
      "expected": "任务实例状态由「运行中」 > 「校验异常」"
    }
  ]
} as const;

test.describe("验证「规则任务管理」中 Doris 3.x 数据源规则任务的编辑功能正常", () => {
  test("C0095 验证「规则任务管理」中 Doris 3.x 数据源规则任务的编辑功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
