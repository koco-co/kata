// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0449",
  "title": "验证审批中心-“数据级别权限申请”详情正确",
  "steps": [
    {
      "action": "1）点击数据级别权限申请记录\n2）查看申请详情",
      "expected": "弹窗显示申请信息正确：\n所属租户、申请时间、申请数据等级、申请理由：申请查看数据等级为“xxx”的查看权限"
    }
  ]
} as const;

test.describe("验证审批中心-“数据级别权限申请”详情正确", () => {
  test("C0449 验证审批中心-“数据级别权限申请”详情正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
