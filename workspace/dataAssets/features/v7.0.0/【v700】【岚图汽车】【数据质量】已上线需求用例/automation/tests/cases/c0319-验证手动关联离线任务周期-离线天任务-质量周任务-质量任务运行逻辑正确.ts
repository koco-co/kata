// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0319",
  "title": "验证「手动关联离线任务周期」-离线「天任务」-质量「周任务」-质量任务运行逻辑正确",
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
      "action": "「质量任务周期」选择「周」，「生效日期」选择为「2025-11-01～2025-12-01」，「周二」「周三」",
      "expected": "配置成功"
    },
    {
      "action": "「任务关联」添加离线任务A",
      "expected": "关联离线任务成功"
    },
    {
      "action": "触发离线任务A实例运行",
      "expected": "周一离线任务实例运行，质量任务实例不运行；周二、周三当天离线任务实例运行完成后质量任务运行"
    }
  ]
} as const;

test.describe("验证「手动关联离线任务周期」-离线「天任务」-质量「周任务」-质量任务运行逻辑正确", () => {
  test("C0319 验证「手动关联离线任务周期」-离线「天任务」-质量「周任务」-质量任务运行逻辑正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
