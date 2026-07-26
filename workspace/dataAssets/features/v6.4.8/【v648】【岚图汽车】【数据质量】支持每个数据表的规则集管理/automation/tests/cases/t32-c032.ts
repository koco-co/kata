// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C032",
  "title": "验证更换规则包名称后, 校验规则配置不变",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则集管理】页面,  编辑规则集rule01, 点击下一步",
      "expected": "进入【编辑规则集 ❯ 监控规则】配置页面"
    },
    {
      "action": "将原规则包1更换为规则包2",
      "expected": "规则包下的校验规则配置内容不变"
    }
  ]
} as const;

test.describe("验证更换规则包名称后, 校验规则配置不变", () => {
  test("C032 验证更换规则包名称后, 校验规则配置不变", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
