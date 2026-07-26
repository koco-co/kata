// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C057",
  "title": "验证表订阅功能正常",
  "steps": [
    {
      "action": "点击【订阅】按钮",
      "expected": "弹【订阅】弹窗"
    },
    {
      "action": "【订阅】弹窗UI CHECK",
      "expected": "title 展示“订阅”，鼠标hover“？”提示“完成订阅后，当元数据发生变更时，系统会按订阅的提醒方式发出通知。”\n告警方式，鼠标hover“？”提示“各个告警通道需要先在公共管理配置默认告警通道，否则配置后无效”\n展示【邮箱】【钉钉】【自定义】通道选择\n取消，确定，关闭弹窗“X”按钮"
    },
    {
      "action": "选择【邮箱】/【钉钉】告警，如果钉钉输入【webhook】地址",
      "expected": "配置成功"
    },
    {
      "action": "点击确认",
      "expected": "订阅成功，订阅按钮展示为“取消订阅”"
    },
    {
      "action": "进入【元数据】-【订阅的数据】页面",
      "expected": "展示表A订阅信息"
    },
    {
      "action": "点击【取消订阅】按钮，二次确认",
      "expected": "取消订阅成功，右侧订阅按钮展示为“订阅”"
    },
    {
      "action": "进入【元数据】-【订阅的数据】页面",
      "expected": "隐藏表A订阅信息"
    }
  ]
} as const;

test.describe("验证表订阅功能正常", () => {
  test("C057 验证表订阅功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
