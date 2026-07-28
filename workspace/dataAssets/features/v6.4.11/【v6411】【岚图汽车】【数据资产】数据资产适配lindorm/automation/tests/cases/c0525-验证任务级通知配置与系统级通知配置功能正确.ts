// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0525",
  "title": "验证任务级通知配置与系统级通知配置功能正确",
  "steps": [
    {
      "action": "1.  单个元数据实时同步任务中，设置通知模式为邮件，通知人为a用户，保存任务\n2.  在通知配置中，接收人选a用户，通知模式设置为邮件，选择模块为元数据实时同步任务\n3. 该元数据实时同步任务触发告警",
      "expected": "消息记录内只产生一条通知信息"
    },
    {
      "action": "1.  单个元数据实时同步任务中，设置通知模式为邮件，通知人为a用户，保存任务\n2.  在通知配置中，接收人选a用户，通知模式设置为dingding，选择模块为元数据实时同步任务\n3. 该元数据实时同步任务触发告警",
      "expected": "消息记录产生两条通知信息，分别为通知渠道邮件/钉钉"
    }
  ]
} as const;

test.describe("验证任务级通知配置与系统级通知配置功能正确", () => {
  test("C0525 验证任务级通知配置与系统级通知配置功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
