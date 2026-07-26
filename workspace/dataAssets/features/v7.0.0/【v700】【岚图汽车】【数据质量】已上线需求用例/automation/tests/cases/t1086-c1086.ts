// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1086",
  "title": "验证【规则集管理 ❯ 新建规则集 ❯ 监控规则 ❯】更换规则包名称后, 校验规则配置不变",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则集管理】页面, 点击新增规则集",
      "expected": "进入【新建规则集 ❯ 基础信息】配置页面"
    },
    {
      "action": "正常配置基础信息内容, 点击下一步",
      "expected": "进入「监控规则」配置页面"
    },
    {
      "action": "选择规则包1, 添加并配置校验规则1",
      "expected": "配置成功"
    },
    {
      "action": "切换为规则包2, 检查校验规则配置信息",
      "expected": "规则配置不变: 更换选择不同的规则包名称不影响已经配置的规则"
    }
  ]
} as const;

test.describe("验证【规则集管理 ❯ 新建规则集 ❯ 监控规则 ❯】更换规则包名称后, 校验规则配置不变", () => {
  test("C1086 验证【规则集管理 ❯ 新建规则集 ❯ 监控规则 ❯】更换规则包名称后, 校验规则配置不变", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
