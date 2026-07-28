// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0459",
  "title": "验证分级分类权限申请-【申请权限】功能逻辑正确",
  "steps": [
    {
      "action": "1）配置“保密”级别，“开放用户等级”为L3；\n2）L1用户点击【申请权限】；",
      "expected": "显示二次确认弹窗，提示信息：请确认是否申请该等级的查看权限"
    },
    {
      "action": "二次确认后",
      "expected": "1）提示：申请权限成功，若需查看审批进度可前往【公共管理-审批管理】模块，点击 跳转 可直接查看审批进度。\n2）点击【跳转】进入审批中心-我的申请页面"
    },
    {
      "action": "1）管理员或其他有审批权限的用户通过L1用户的审批；\n2）【自动分级】中为SparkThrift2.x类型配置“字段名识别”referrer_url，级别为：保密，并触发生效",
      "expected": "L1用户有权限查看到表referrer_url字段数据"
    }
  ]
} as const;

test.describe("验证分级分类权限申请-【申请权限】功能逻辑正确", () => {
  test("C0459 验证分级分类权限申请-【申请权限】功能逻辑正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
