// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0504",
  "title": "验证角色管理-自定义角色显示交互正确",
  "steps": [
    {
      "action": "登陆超管账号，点击资产平台右上角设置icon下的角色管理，查看自定义角色的样式",
      "expected": "角色名称右侧显示查看、编辑、删除icon"
    },
    {
      "action": "鼠标置于查看icon上",
      "expected": "显示：角色名称、角色描述、最近修改人、最近修改时间"
    },
    {
      "action": "点击编辑icon",
      "expected": "弹出编辑角色弹窗，角色名称可编辑，角色描述可编辑"
    },
    {
      "action": "编辑角色名称和角色描述内容，点击取消，之后鼠标置于查看icon上，查看角色名称和角色描述内容",
      "expected": "显示为编辑前内容"
    },
    {
      "action": "编辑角色名称和角色描述内容，点击确定，之后鼠标置于查看icon上，查看角色名称和角色描述内容",
      "expected": "显示为编辑后内容，添加用户、编辑用户、添加用户组、编辑用户组弹窗的角色设置的该自定义角色名称也显示为编辑后的名称"
    },
    {
      "action": "点击删除icon",
      "expected": "二次弹窗确认：确定删除这个角色吗?"
    },
    {
      "action": "点击取消",
      "expected": "该自定义角色未被删除"
    },
    {
      "action": "点击确认",
      "expected": "该自定义角色删除成功，添加用户、编辑用户、添加用户组、编辑用户组弹窗的角色设置删除该自定义角色"
    }
  ]
} as const;

test.describe("验证角色管理-自定义角色显示交互正确", () => {
  test("C0504 验证角色管理-自定义角色显示交互正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
