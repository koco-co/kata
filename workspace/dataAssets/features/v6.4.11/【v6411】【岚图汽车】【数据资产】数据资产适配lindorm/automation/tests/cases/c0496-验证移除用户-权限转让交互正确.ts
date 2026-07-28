// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0496",
  "title": "验证移除用户-权限转让交互正确",
  "steps": [
    {
      "action": "点击【移出产品】",
      "expected": "显示「用户权限」弹窗：\n\t- 选择转让人：单选下拉框\n\t- 提示文案：注意：该用户已绑定权限模块包含数据治理、数据安全、元数据模块，请确认该用户的权限转让人，配置后平台将把该用户的记录信息修改为新的被转让人信息，同时转让人会拥有该用户的所有权限。转让人只能选择该用户所属角色下的用户。\n\t- 【取消】/【确定】按钮"
    },
    {
      "action": "1）所选用户A角色包括：管理员、开发、访客\n2）查看“选择转让人”，下拉列表",
      "expected": "下拉列表为管理员角色下的所有用户"
    },
    {
      "action": "1）所选用户A角色包括：开发、访客\n2）查看“选择转让人”，下拉列表",
      "expected": "下拉列表为开发角色下的所有用户"
    },
    {
      "action": "选择转让人，存在已配置告警webhook；",
      "expected": "弹窗下方显示webhook输入框"
    },
    {
      "action": "选择转让人，不存在已配置告警webhook；",
      "expected": "弹窗下方显示webhook输入框"
    },
    {
      "action": "选择转让人，输入webhook\n点击【确定】",
      "expected": "操作成功"
    }
  ]
} as const;

test.describe("验证移除用户-权限转让交互正确", () => {
  test("C0496 验证移除用户-权限转让交互正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
