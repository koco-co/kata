// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0017",
  "title": "验证数据标准-新建标准点击取消",
  "steps": [
    {
      "action": "进入【数据标准】-【标准定义】页面，点击【新建标准】；填写必填项后点击【取消】",
      "expected": "页面返回标准列表；未新增新的标准记录"
    }
  ]
} as const;

test.describe("验证数据标准-新建标准点击取消", () => {
  test("C0017 验证数据标准-新建标准点击取消", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
