// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C182",
  "title": "验证订阅弹窗功能",
  "steps": [
    {
      "action": "查看订阅弹窗内容",
      "expected": "1.显示弹窗标题：订阅\n2.显示可选项告警方式：邮箱、钉钉\n3.显示【取消】【确定】按钮"
    },
    {
      "action": "对xx表进行订阅，告警方式选择邮箱",
      "expected": "xx表订阅成功，告警方式为邮箱"
    },
    {
      "action": "1.对xx表进行订阅，告警方式选择钉钉\n2.填写WebHook",
      "expected": "xx表订阅成功，告警方式为钉钉"
    },
    {
      "action": "1.对xx表进行订阅，告警方式选择邮箱和钉钉\n2.填写WebHook",
      "expected": "xx表订阅成功，告警方式为邮箱和钉钉"
    }
  ]
} as const;

test.describe("验证订阅弹窗功能", () => {
  test("C182 验证订阅弹窗功能", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
