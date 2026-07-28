// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0503",
  "title": "验证角色管理-非自定义角色显示交互正确",
  "steps": [
    {
      "action": "登陆超管账号，点击资产平台右上角设置icon下的角色管理，查看非自定义角色的样式",
      "expected": "角色名称右侧只显示查看和编辑icon"
    },
    {
      "action": "鼠标置于查看icon上",
      "expected": "显示：角色名称、角色描述、最近修改人、最近修改时间"
    },
    {
      "action": "点击编辑icon",
      "expected": "弹出编辑角色弹窗，角色名称不可编辑，角色描述可编辑"
    },
    {
      "action": "编辑角色描述内容，点击取消，之后鼠标置于查看icon上，查看角色描述内容",
      "expected": "显示为编辑前内容"
    },
    {
      "action": "编辑角色描述内容，点击确定，之后鼠标置于查看icon上，查看角色描述内容",
      "expected": "显示为编辑后内容"
    }
  ]
} as const;

test.describe("验证角色管理-非自定义角色显示交互正确", () => {
  test("C0503 验证角色管理-非自定义角色显示交互正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
