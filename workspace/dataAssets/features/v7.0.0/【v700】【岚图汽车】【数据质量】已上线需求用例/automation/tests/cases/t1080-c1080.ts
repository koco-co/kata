// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1080",
  "title": "验证【规则集管理 ❯ 编辑规则集 ❯ 监控规则 ❯】规则包下拉框数据正常",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则集管理】页面, 编辑规则集rule01, 点击下一步",
      "expected": "进入【编辑规则集 ❯ 监控规则】配置页面"
    },
    {
      "action": "展开规则包下拉框",
      "expected": "下拉框数据为基础信息配置页面中添加的规则包名称"
    },
    {
      "action": "检查规则包下拉框数据",
      "expected": "已选择过的规则包(rule01)不支持再次选择"
    }
  ]
} as const;

test.describe("验证【规则集管理 ❯ 编辑规则集 ❯ 监控规则 ❯】规则包下拉框数据正常", () => {
  test("C1080 验证【规则集管理 ❯ 编辑规则集 ❯ 监控规则 ❯】规则包下拉框数据正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
