// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0448",
  "title": "验证审批中心-“数据级别权限申请”筛选功能正确",
  "steps": [
    {
      "action": "1）进入【审批授权】-任一tab-数据资产；\n2）对接内容选择“数据级别权限申请”，点击【查询】",
      "expected": "右侧显示“数据级别权限申请”的申请记录，以下数据显示正确：\n申请人、申请数据等级、申请时间、租户"
    }
  ]
} as const;

test.describe("验证审批中心-“数据级别权限申请”筛选功能正确", () => {
  test("C0448 验证审批中心-“数据级别权限申请”筛选功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
