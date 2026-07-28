// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0694",
  "title": "验证总规则 3条，0条校验失败，0条校验未通过质量通知任务内容正常",
  "steps": [
    {
      "action": "1. 立即执行该质量规则，等待任务执行完成",
      "expected": "1. 不会触发告警"
    }
  ]
} as const;

test.describe("验证总规则 3条，0条校验失败，0条校验未通过质量通知任务内容正常", () => {
  test("C0694 验证总规则 3条，0条校验失败，0条校验未通过质量通知任务内容正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
