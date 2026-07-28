// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0038",
  "title": "验证「监控对象」配置页面-「手动输入分区」「选择已有分区」位置调换",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击「新建监控规则」按钮",
      "expected": "直接进入「监控对象」配置页面"
    },
    {
      "action": "UI CHECK",
      "expected": "「选择已有分区」移动到「手动输入分区」左边"
    }
  ]
} as const;

test.describe("验证「监控对象」配置页面-「手动输入分区」「选择已有分区」位置调换", () => {
  test("C0038 验证「监控对象」配置页面-「手动输入分区」「选择已有分区」位置调换", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
