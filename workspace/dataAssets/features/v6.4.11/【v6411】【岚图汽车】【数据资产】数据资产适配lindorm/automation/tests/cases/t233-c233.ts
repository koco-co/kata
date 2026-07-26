// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C233",
  "title": "验证落标检查任务配置环境参数后功能正确",
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
      "action": "修改环境参数内容，点击取消",
      "expected": "取消成功，参数内容不变"
    },
    {
      "action": "修改环境参数内容，点击确定",
      "expected": ""
    },
    {
      "action": "其余内容正确配置，点击新增并立即执行",
      "expected": "任务保存成功，为检查中状态"
    },
    {
      "action": "等待检查完成，查看任务明细",
      "expected": "成功完成检查，任务明细正确"
    },
    {
      "action": "进入yarn地址查看环境参数是否生效",
      "expected": "环境参数配置生效"
    }
  ]
} as const;

test.describe("验证落标检查任务配置环境参数后功能正确", () => {
  test("C233 验证落标检查任务配置环境参数后功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
