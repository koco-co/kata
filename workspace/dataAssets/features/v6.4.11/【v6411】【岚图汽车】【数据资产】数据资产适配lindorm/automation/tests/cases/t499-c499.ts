// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C499",
  "title": "验证用户管理-添加用户功能正常",
  "steps": [
    {
      "action": "点击「添加用户」按钮",
      "expected": "title为添加成员的弹窗\n弹出用户下拉框；\n角色：管理员、数据开发、访客\n质量模块所属项目下拉框"
    },
    {
      "action": "查看用户下拉框",
      "expected": "显示未添加进资产且有资产权限的用户"
    },
    {
      "action": "1）选择用户A，分配“管理员”角色，质量项目配置某具体项目\n2）点击【确定】",
      "expected": "用户A添加成功，且数据正确"
    },
    {
      "action": "1）选择用户B，分配“数据开发”角色，质量项目配置某具体项目\n2）点击【确定】",
      "expected": "用户B添加成功，且数据正确"
    },
    {
      "action": "1）选择用户C，分配“访客”角色，质量项目配置某具体项目\n2）点击【确定】",
      "expected": "用户C添加成功，且数据正确"
    },
    {
      "action": "1）选择用户B，分配“数据开发”角色，质量项目配置“全部”\n2）点击【确定】",
      "expected": "用户B添加成功，且数据正确"
    }
  ]
} as const;

test.describe("验证用户管理-添加用户功能正常", () => {
  test("C499 验证用户管理-添加用户功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
