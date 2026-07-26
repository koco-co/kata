// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C318",
  "title": "验证「手动关联离线任务周期」-离线「天任务」-质量「月任务」-质量任务运行逻辑正确",
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
      "action": "「质量任务周期」选择「月」，「生效日期」选择为「2025-11-01～2025-12-01」，「每月15号」「每月30号」",
      "expected": "配置成功"
    },
    {
      "action": "「任务关联」添加离线任务A",
      "expected": "关联离线任务成功"
    },
    {
      "action": "触发离线任务A实例运行",
      "expected": "质量任务仅在15/30号两天进行实例调度运行，且在离线实例运行过程后执行"
    }
  ]
} as const;

test.describe("验证「手动关联离线任务周期」-离线「天任务」-质量「月任务」-质量任务运行逻辑正确", () => {
  test("C318 验证「手动关联离线任务周期」-离线「天任务」-质量「月任务」-质量任务运行逻辑正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
