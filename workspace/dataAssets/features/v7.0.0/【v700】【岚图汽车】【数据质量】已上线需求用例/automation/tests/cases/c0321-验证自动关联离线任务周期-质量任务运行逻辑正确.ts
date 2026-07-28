// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0321",
  "title": "验证「自动关联离线任务周期」-质量任务运行逻辑正确",
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
      "action": "「调度周期」选择「自动关联离线任务周期」",
      "expected": "选择成功"
    },
    {
      "action": "「任务关联」添加离线任务A",
      "expected": "关联离线任务成功"
    },
    {
      "action": "触发离线任务A实例运行",
      "expected": "离线任务运行完成后运行质量校验任务"
    },
    {
      "action": "编辑规则，「任务关联」修改为离线任务B，保存规则",
      "expected": "关联任务变更正确"
    },
    {
      "action": "触发离线任务B实例运行",
      "expected": "离线任务运行完成后运行质量校验任务"
    },
    {
      "action": "编辑规则，「任务关联」修改为离线任务C，保存规则",
      "expected": "关联任务变更正确"
    },
    {
      "action": "触发离线任务C实例运行",
      "expected": "离线任务运行完成后运行质量校验任务"
    }
  ]
} as const;

test.describe("验证「自动关联离线任务周期」-质量任务运行逻辑正确", () => {
  test("C0321 验证「自动关联离线任务周期」-质量任务运行逻辑正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
