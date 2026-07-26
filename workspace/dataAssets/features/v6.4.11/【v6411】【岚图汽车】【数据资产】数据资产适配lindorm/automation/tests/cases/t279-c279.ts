// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C279",
  "title": "验证「审批中」页面批量撤回的功能",
  "steps": [
    {
      "action": "未勾选审批申请，查看批量撤回icon的展示",
      "expected": "【撤回】按钮置灰"
    },
    {
      "action": "勾选多个未被操作的审批申请，点击批量撤回icon",
      "expected": "二次弹窗确认：\n是否批量撤回审批申请？\n撤回后表将恢复到提交审批前状态"
    },
    {
      "action": "点击否",
      "expected": "列表还存在被勾选的审批申请"
    },
    {
      "action": "点击是",
      "expected": "全局提示：操作成功；\n「审批中」页面列表不显示被勾选的审批申请；\n「已审批」页面列表显示被勾选的审批申请，状态显示为已撤回"
    },
    {
      "action": "开启两个无痕页面，一个页面登录管理员a，通过数据开发b的审批申请A和拒绝审批申请B，之后在另一个页面登录数据开发b，勾选一个未被操作的审批申请C以及审批申请AB，点击批量撤回",
      "expected": "二次弹窗确认：\n是否批量撤回审批申请？\n撤回后表将恢复到提交审批前状态"
    },
    {
      "action": "点击是",
      "expected": "全局提示：1张表撤回审批成功；2张表撤回审批失败，已被操作，无法撤回；\n「审批中」页面列表不显示被勾选的审批申请；\n「已审批」页面列表显示被勾选的审批申请，审批申请A状态为已通过，B状态为已拒绝，C状态为已撤回"
    }
  ]
} as const;

test.describe("验证「审批中」页面批量撤回的功能", () => {
  test("C279 验证「审批中」页面批量撤回的功能", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
