// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C322",
  "title": "验证「具体时间」配置项展示逻辑正确",
  "steps": [
    {
      "action": "进入「数据质量」-「规则任务管理」-「调度属性」配置页面",
      "expected": "进入成功"
    },
    {
      "action": "「调度周期」选择「手动关联离线任务周期」",
      "expected": "选择成功"
    },
    {
      "action": "任务关联选择关联离线任务A",
      "expected": "调度配置不展示「具体时间」配置项"
    },
    {
      "action": "任务关联选择关联离线任务B",
      "expected": "调度配置不展示「具体时间」配置项"
    },
    {
      "action": "任务关联选择关联离线任务C",
      "expected": "调度配置不展示「具体时间」配置项"
    },
    {
      "action": "任务关联选择关联离线任务D",
      "expected": "调度配置不展示「具体时间」配置项"
    },
    {
      "action": "任务关联选择关联离线任务E",
      "expected": "调度配置不展示「具体时间」配置项"
    },
    {
      "action": "任务关联选择关联离线任务F",
      "expected": "调度配置展示「具体时间」配置项"
    },
    {
      "action": "任务关联选择关联离线任务G",
      "expected": "调度配置展示「具体时间」配置项"
    }
  ]
} as const;

test.describe("验证「具体时间」配置项展示逻辑正确", () => {
  test("C322 验证「具体时间」配置项展示逻辑正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
