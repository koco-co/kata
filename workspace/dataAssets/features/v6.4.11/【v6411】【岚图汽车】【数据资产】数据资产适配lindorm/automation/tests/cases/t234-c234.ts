// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C234",
  "title": "验证落标检查任务新增【环境参数】配置，限制数据源正确",
  "steps": [
    {
      "action": "进入【资产-数据标准-落标检查】页面",
      "expected": "页面正常进入"
    },
    {
      "action": "新建落标检查任务，进入检查内容配置页面",
      "expected": "仅显示sparkthrift数据源"
    },
    {
      "action": "进入调度配置页面",
      "expected": "展示「环境参数配置」按钮"
    },
    {
      "action": "点击「环境参数配置」按钮",
      "expected": "弹出参数配置弹窗，弹窗内为参数编辑框，展示可配置的Spark参数及注释说明"
    },
    {
      "action": "查看环境参数内容",
      "expected": ""
    }
  ]
} as const;

test.describe("验证落标检查任务新增【环境参数】配置，限制数据源正确", () => {
  test("C234 验证落标检查任务新增【环境参数】配置，限制数据源正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
