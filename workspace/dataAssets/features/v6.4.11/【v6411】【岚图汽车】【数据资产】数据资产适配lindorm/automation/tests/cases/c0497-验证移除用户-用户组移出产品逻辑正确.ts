// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0497",
  "title": "验证移除用户-用户组移出产品逻辑正确",
  "steps": [
    {
      "action": "所选用户组内，存在用户A为资产用户；\n点击【移出产品】",
      "expected": "1）弹窗提示：“该用户组内存在用户还未移除产品，移除用户组后该用户组内的用户默认归属用户组为空，且该用户组角色将会全部移除”\n2）确认移出后，用户A所属用户组为空"
    },
    {
      "action": "所选用户组内，不存在用户为资产用户；\n点击【移出产品】",
      "expected": "1）弹窗提示：“移除后该用户组角色将会全部移除”\n2）确认移出后，该用户组记录被删除"
    }
  ]
} as const;

test.describe("验证移除用户-用户组移出产品逻辑正确", () => {
  test("C0497 验证移除用户-用户组移出产品逻辑正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
