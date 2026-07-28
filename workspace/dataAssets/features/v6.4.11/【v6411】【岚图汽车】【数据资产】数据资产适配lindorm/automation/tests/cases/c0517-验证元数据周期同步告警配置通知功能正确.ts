// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0517",
  "title": "验证元数据周期同步告警配置通知功能正确",
  "steps": [
    {
      "action": "1）新增通知配置-模块选择元数据周期同步\n2）选择接收人，输入必填信息\n3）点击确认按钮，元数据周期同步任务触发告警",
      "expected": "接收人正常接收告警通知"
    }
  ]
} as const;

test.describe("验证元数据周期同步告警配置通知功能正确", () => {
  test("C0517 验证元数据周期同步告警配置通知功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
