// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0092",
  "title": "验证「规则任务管理」中 Doris 3.x 数据源规则任务的周期调度设置功能正常",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击「新建监控规则」按钮，进入监控规则配置页面",
      "expected": "进入成功"
    },
    {
      "action": "配置「数据源」「数据库」「数据表」等信息，选择【完整性校验】规则",
      "expected": "选择成功，展示【完整性校验】规则配置项"
    },
    {
      "action": "「校验类型」选择「单表」「统计函数」 选择「表行数」「过滤条件」 无「校验方法」选择「固定值」「期望值」选择「>5」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」",
      "expected": "配置完成"
    },
    {
      "action": "点击「保存」按钮",
      "expected": "规则配置保存正确"
    },
    {
      "action": "点击「下一步」，保持默认「调度配置」",
      "expected": "调度属性配置完成"
    },
    {
      "action": "点击「保存」按钮",
      "expected": "规则保存成功"
    },
    {
      "action": "等待周期运行",
      "expected": "T+1 00:00 生成任务实例, 状态由「运行中」 > 「校验通过」"
    }
  ]
} as const;

test.describe("验证「规则任务管理」中 Doris 3.x 数据源规则任务的周期调度设置功能正常", () => {
  test("C0092 验证「规则任务管理」中 Doris 3.x 数据源规则任务的周期调度设置功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
