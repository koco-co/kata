// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0474",
  "title": "验证自动分级-重新生效功能正确",
  "steps": [
    {
      "action": "查看重新生效icon的展示",
      "expected": "状态为分级中的icon置灰不可点击，状态为已生效的icon为蓝色可点击状态"
    },
    {
      "action": "点击重新生效icon",
      "expected": "1）该规则状态更改为分级中，icon置灰不可点击；\n2）更新时间显示为重新生效的时间"
    },
    {
      "action": "等待分级结束",
      "expected": "规则状态更改为已生效，icon变为蓝色可点击状态"
    }
  ]
} as const;

test.describe("验证自动分级-重新生效功能正确", () => {
  test("C0474 验证自动分级-重新生效功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
