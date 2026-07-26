// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C001",
  "title": "验证已接入数据源统计数据正确",
  "steps": [
    {
      "action": "进入资产-【资产盘点】页面",
      "expected": "进入成功，URL不包含login"
    },
    {
      "action": "查看”已接入数据源”",
      "expected": "显示截止前一天为止接入的数据源类型的统计卡片"
    },
    {
      "action": "查看统计数据：昨日新增表数、源数、库数、表数以及存储量",
      "expected": "统计数据为对应数据源类型下前一天的统计数据，页面包含数据源/表数/库数/存储等文本"
    }
  ]
} as const;

test.describe("验证已接入数据源统计数据正确", () => {
  test("C001 验证已接入数据源统计数据正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
