// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1210",
  "title": "验证元数据同步任务新增「环境参数」配置，限制数据源正确",
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
      "action": "查看环境参数内容",
      "expected": "5. 不展示「环境参数配置」按钮"
    },
    {
      "action": "重新新增周期同步任务，选择doris/hive/mysql……数据源，进入调度配置页面",
      "expected": ""
    }
  ]
} as const;

test.describe("验证元数据同步任务新增「环境参数」配置，限制数据源正确", () => {
  test("C1210 验证元数据同步任务新增「环境参数」配置，限制数据源正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
