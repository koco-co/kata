// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1224",
  "title": "验证「数据治理」告警接收人-同步生效功能回归",
  "steps": [
    {
      "action": "进入数据资产-数据治理-治理工作台-治理任务管理页面",
      "expected": "进入成功"
    },
    {
      "action": "选择待治理的任务，点击「治理项处理」",
      "expected": "弹「治理项处理」弹窗"
    },
    {
      "action": "选择「指派处理人」",
      "expected": "弹「指派处理人」弹窗"
    },
    {
      "action": "查看「指派处理人」\n勾选「短信」「邮箱」「钉钉」「自定义」告警通道\n所有通道均选择用户A、B、C",
      "expected": "配置成功"
    },
    {
      "action": "点击「确定」通知处理人",
      "expected": "A、B、C处理人均接收到信息"
    }
  ]
} as const;

test.describe("验证「数据治理」告警接收人-同步生效功能回归", () => {
  test("C1224 验证「数据治理」告警接收人-同步生效功能回归", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
