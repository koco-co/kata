// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C301",
  "title": "验证【数据质量-权限控制】规则库配置页面权限控制正确",
  "steps": [
    {
      "action": "使用具备管理员权限的用户进入【数据质量】模块",
      "expected": "1)管理员可看到数据质量左侧完整菜单"
    },
    {
      "action": "切换为仅配置目标权限的角色访问【规则库配置】页面",
      "expected": "1)有查看权限时页面可访问\n2)无操作权限时新增、编辑、删除等操作入口不可用\n3)无查看权限时菜单或页面不可访问"
    }
  ]
} as const;

test.describe("验证【数据质量-权限控制】规则库配置页面权限控制正确", () => {
  test("C301 验证【数据质量-权限控制】规则库配置页面权限控制正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
