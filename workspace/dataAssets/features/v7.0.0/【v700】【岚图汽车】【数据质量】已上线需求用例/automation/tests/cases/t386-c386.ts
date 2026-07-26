// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C386",
  "title": "验证【「数据资产」-「数据质量」-「规则任务管理」】自定义sql-引用规则",
  "steps": [
    {
      "action": "提示词：选择引用规则",
      "expected": "提示词正确"
    },
    {
      "action": "选择枚举",
      "expected": "引用规则支持选择规则库配置-自定义正则模块创建的规则名称"
    },
    {
      "action": "必选",
      "expected": "为空提示"
    },
    {
      "action": "仅支持单选",
      "expected": "选择成功"
    },
    {
      "action": "选择自定义模版",
      "expected": "成功可关联出定义的sql模版自动填入到sql框中，参数列表同步更新，显示正确"
    },
    {
      "action": "切换选择自定义模版",
      "expected": "sql模版更新，参数列表同步更新，显示正确"
    }
  ]
} as const;

test.describe("验证【「数据资产」-「数据质量」-「规则任务管理」】自定义sql-引用规则", () => {
  test("C386 验证【「数据资产」-「数据质量」-「规则任务管理」】自定义sql-引用规则", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
