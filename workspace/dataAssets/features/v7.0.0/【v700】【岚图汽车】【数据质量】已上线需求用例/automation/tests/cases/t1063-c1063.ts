// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1063",
  "title": "验证「数据质量-总览」-「最近一次更新时间」内容正确更新",
  "steps": [
    {
      "action": "进入【资产-数据质量-总览】页面",
      "expected": "页面正常进入"
    },
    {
      "action": "查看【最近一次更新时间】",
      "expected": "显示为2026-03-13 15:00:00"
    },
    {
      "action": "等待30分钟，查看【最近一次更新时间】",
      "expected": "未变化，显示为2026-03-13 15:00:00"
    },
    {
      "action": "等待1小时，查看【最近一次更新时间】",
      "expected": "变化为2026-03-13 16:00:00"
    }
  ]
} as const;

test.describe("验证「数据质量-总览」-「最近一次更新时间」内容正确更新", () => {
  test("C1063 验证「数据质量-总览」-「最近一次更新时间」内容正确更新", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
