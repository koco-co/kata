// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C316",
  "title": "验证「手动关联离线任务周期」-离线「cron表达式任务」-质量「天任务」-质量任务运行逻辑正确",
  "steps": [
    {
      "action": "进入「数据质量」-「规则任务管理」页面",
      "expected": "进入成功"
    },
    {
      "action": "选择规则A，编辑进入「调度属性」配置页面",
      "expected": "进入成功"
    },
    {
      "action": "「调度周期」选择「手动关联离线任务周期」",
      "expected": "选择成功"
    },
    {
      "action": "「质量任务周期」选择「天」，「生效日期」选择为「2025-11-01～2025-12-01」 具体时间为「13:00」",
      "expected": "配置成功"
    },
    {
      "action": "「任务关联」添加离线任务A",
      "expected": "关联离线任务成功"
    },
    {
      "action": "触发离线任务A实例运行",
      "expected": "在离线任务调度后，质量任务能够正常调度"
    },
    {
      "action": "编辑规则，「质量任务周期」选择「天」，「生效日期」选择为「2025-11-01～2025-12-01」 具体时间为「10:00」",
      "expected": "编辑成功"
    },
    {
      "action": "「任务关联」添加离线任务A",
      "expected": "关联离线任务成功"
    },
    {
      "action": "触发离线任务A实例运行",
      "expected": "10点时，质量任务不运行，等到12点后离线任务运行完成后质量任务起调；"
    }
  ]
} as const;

test.describe("验证「手动关联离线任务周期」-离线「cron表达式任务」-质量「天任务」-质量任务运行逻辑正确", () => {
  test("C316 验证「手动关联离线任务周期」-离线「cron表达式任务」-质量「天任务」-质量任务运行逻辑正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
