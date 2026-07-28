// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0293",
  "title": "验证【规则库配置-内置规则】规则状态开启关闭正常",
  "steps": [
    {
      "action": "进入【数据质量 → 规则库配置】页面并停留在「内置规则」页签",
      "expected": "1)展示「规则库配置」「内置规则」「自定义正则」「自定义sql模版」\n2)列表列包含「规则名称」「规则解释」「规则分类」「关联范围」「关联规则数」「规则状态」「规则描述」"
    },
    {
      "action": "在内置规则列表中切换目标规则「规则状态」",
      "expected": "1)关闭后规则状态变为关闭且规则集新增规则时不可选择该内置规则\n2)再次开启后规则状态恢复且可被规则集引用"
    }
  ]
} as const;

test.describe("验证【规则库配置-内置规则】规则状态开启关闭正常", () => {
  test("C0293 验证【规则库配置-内置规则】规则状态开启关闭正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
