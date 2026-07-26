// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C445",
  "title": "验证编辑用户等级功能正确",
  "steps": [
    {
      "action": "1）进入【用户中心】-【用户管理】；\n2）点击某用户账号；\n3）查看详情页",
      "expected": "1）详情页-基本信息部分，显示该用户的“用户等级”数据及其他用户信息；\n2）“用户等级”支持编辑；\n3）hover提示：用户等级可应用于数栈—数据资产中的数据权限模块，通过用户等级决定该用户可查看的数据权限级别。"
    },
    {
      "action": "详情页编辑“用户等级”：\n1）点击【用户等级】的【编辑】；\n2）选择其中一个“用户等级”选项",
      "expected": "该用户的用户等级编辑成功"
    }
  ]
} as const;

test.describe("验证编辑用户等级功能正确", () => {
  test("C445 验证编辑用户等级功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
