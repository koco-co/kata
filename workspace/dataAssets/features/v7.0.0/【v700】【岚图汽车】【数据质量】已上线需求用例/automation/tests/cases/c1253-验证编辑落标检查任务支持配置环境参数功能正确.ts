// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1253",
  "title": "验证编辑落标检查任务支持配置环境参数，功能正确",
  "steps": [
    {
      "action": "进入【资产-数据标准-落标检查】页面",
      "expected": "页面正常进入"
    },
    {
      "action": "选择落标任务A，点击编辑",
      "expected": "进入编辑任务页面"
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
      "action": "修改环境参数内容，点击确定",
      "expected": "6. 任务保存成功，为检查中状态"
    },
    {
      "action": "其余内容正确配置，点击新增并立即执行",
      "expected": "成功完成检查，任务明细正确"
    },
    {
      "action": "等待检查完成，查看任务明细",
      "expected": "环境参数配置生效"
    },
    {
      "action": "进入yarn地址查看环境参数是否生效",
      "expected": ""
    }
  ]
} as const;

test.describe("验证编辑落标检查任务支持配置环境参数，功能正确", () => {
  test("C1253 验证编辑落标检查任务支持配置环境参数，功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
