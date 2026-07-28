// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0520",
  "title": "验证数据治理待治理项通知配置通知功能正确",
  "steps": [
    {
      "action": "1）新增通知配置-模块选择数据待治理项\n2）选择接收人，输入必填信息\n3）点击确认按钮，数据待治理项任务触发告警",
      "expected": "接收人正常接收告警通知"
    }
  ]
} as const;

test.describe("验证数据治理待治理项通知配置通知功能正确", () => {
  test("C0520 验证数据治理待治理项通知配置通知功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
