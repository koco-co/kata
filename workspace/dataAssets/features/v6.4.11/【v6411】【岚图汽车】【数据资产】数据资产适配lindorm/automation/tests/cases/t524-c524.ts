// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C524",
  "title": "验证不同告警渠道-告警通知正常",
  "steps": [
    {
      "action": "1）进入资产平台\n2）点击平台管理-通知中心-通知配置\n3）点击新增按钮，选择接收人a \n4）选择模块【元数据实时同步】\n5）选择告警渠道为钉钉\n6）输入必填信息，保存。\n7）任务触发告警",
      "expected": "a用户接收到告警信息，通知渠道为钉钉"
    },
    {
      "action": "1）进入资产平台\n2）点击平台管理-通知中心-通知配置\n3）点击新增按钮，选择接收人a \n4）选择模块【元数据实时同步】\n5）选择告警渠道为短信\n6）输入必填信息，保存。\n7）任务触发告警",
      "expected": "a用户接收到告警信息，通知渠道为短信"
    },
    {
      "action": "1）进入资产平台\n2）点击平台管理-通知中心-通知配置\n3）点击新增按钮，选择接收人a \n4）选择模块【元数据实时同步】\n5）选择告警渠道为短信\n6）输入必填信息，保存。\n7）任务触发告警",
      "expected": "a用户接收到告警信息，通知渠道为短信"
    },
    {
      "action": "1）进入资产平台\n2）点击平台管理-通知中心-通知配置\n3）点击新增按钮，选择接收人a \n4）选择模块【元数据实时同步】\n5）选择告警渠道为自定义jar形式\n6）输入必填信息，保存。\n7）任务触发告警",
      "expected": "a用户接收到告警信息，通知渠道为自定义jar"
    }
  ]
} as const;

test.describe("验证不同告警渠道-告警通知正常", () => {
  test("C524 验证不同告警渠道-告警通知正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
