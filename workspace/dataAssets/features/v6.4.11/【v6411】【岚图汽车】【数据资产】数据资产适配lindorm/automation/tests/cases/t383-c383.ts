// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C383",
  "title": "验证数据权限-删除功能正常",
  "steps": [
    {
      "action": "点击【删除】",
      "expected": "二次确认提示“请确认是否删除此项权限”"
    },
    {
      "action": "点击【确定】",
      "expected": "1）删除成功，列表数据刷新\n2）「安全审计」新增审计日志：\n\t\t- 操作模块：数据安全-数据权限分配\n\t\t- 动作：删除权限\n\t\t- 详细内容：删除了权限策略，删除了${数据源名称}数据源下的权限信息，生效于XX等共XX个用户"
    }
  ]
} as const;

test.describe("验证数据权限-删除功能正常", () => {
  test("C383 验证数据权限-删除功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
