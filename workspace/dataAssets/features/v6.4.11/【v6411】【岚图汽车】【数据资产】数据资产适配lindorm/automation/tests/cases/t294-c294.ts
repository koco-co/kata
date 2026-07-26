// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C294",
  "title": "验证【规则库配置-内置规则】导出规则库功能正常",
  "steps": [
    {
      "action": "进入【数据质量 → 规则库配置】页面并停留在「内置规则」页签",
      "expected": "1)展示「规则库配置」「内置规则」「自定义正则」「自定义sql模版」\n2)列表列包含「规则名称」「规则解释」「规则分类」「关联范围」「关联规则数」「规则状态」「规则描述」"
    },
    {
      "action": "点击「导出规则库」",
      "expected": "1)触发规则库导出请求\n2)导出文件包含内置规则的「规则名称」「规则解释」「规则分类」「关联范围」「规则状态」「规则描述」"
    }
  ]
} as const;

test.describe("验证【规则库配置-内置规则】导出规则库功能正常", () => {
  test("C294 验证【规则库配置-内置规则】导出规则库功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
