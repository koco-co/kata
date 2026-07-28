// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1209",
  "title": "验证元数据同步任务配置环境参数后功能正确",
  "steps": [
    {
      "action": "进入【资产-元数据-元数据同步】页面",
      "expected": "页面正常进入"
    },
    {
      "action": "新增周期同步任务，选择sparkthrift数据源，进入调度配置页面",
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
      "expected": "6. 任务保存成功，为同步中状态"
    },
    {
      "action": "其余内容正确配置，点击新增并立即执行",
      "expected": "成功同步，数据地图里对应表详情正确"
    },
    {
      "action": "等待同步完成，查看同步详情",
      "expected": "环境参数配置生效"
    },
    {
      "action": "进入yarn地址查看环境参数是否生效",
      "expected": ""
    }
  ]
} as const;

test.describe("验证元数据同步任务配置环境参数后功能正确", () => {
  test("C1209 验证元数据同步任务配置环境参数后功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
