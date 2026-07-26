// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C275",
  "title": "验证「数据质量」-「规则任务管理」页面权限控制功能正确",
  "steps": [
    {
      "action": "使用A用户登陆，并进入资产项目",
      "expected": "进入成功"
    },
    {
      "action": "进入「数据质量」-「规则任务管理」页面",
      "expected": "进入页面成功，可查看并操作任务配置相关内容"
    },
    {
      "action": "使用B用户登陆，并进入资产项目",
      "expected": "进入成功"
    },
    {
      "action": "进入「数据质量」-「规则任务管理」页面",
      "expected": "进入页面成功，可查看并操作任务配置相关内容"
    },
    {
      "action": "使用C用户登陆，并进入资产项目",
      "expected": "进入成功"
    },
    {
      "action": "进入「数据质量」-「规则任务管理」页面",
      "expected": "进入页面成功，可查看但不可操作任务配置相关内容"
    }
  ]
} as const;

test.describe("验证「数据质量」-「规则任务管理」页面权限控制功能正确", () => {
  test("C275 验证「数据质量」-「规则任务管理」页面权限控制功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
