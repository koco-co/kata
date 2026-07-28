// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0388",
  "title": "验证【「数据资产」-「数据质量」-「规则任务管理」】自定义sql：引用规则选择「自定义模版」-参数列表",
  "steps": [
    {
      "action": "引用规则选择「自定义模版」",
      "expected": "参数列表根据模版展示；若模版发生变更，此处同步更新"
    },
    {
      "action": "参数、参数类型、参数名称，和模版配置的一样",
      "expected": "回显正确，不支持编辑"
    },
    {
      "action": "鼠标覆盖到问号标识上",
      "expected": "正常回显参数说明"
    },
    {
      "action": "参数值",
      "expected": "根据所属类型配置"
    }
  ]
} as const;

test.describe("验证【「数据资产」-「数据质量」-「规则任务管理」】自定义sql：引用规则选择「自定义模版」-参数列表", () => {
  test("C0388 验证【「数据资产」-「数据质量」-「规则任务管理」】自定义sql：引用规则选择「自定义模版」-参数列表", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
