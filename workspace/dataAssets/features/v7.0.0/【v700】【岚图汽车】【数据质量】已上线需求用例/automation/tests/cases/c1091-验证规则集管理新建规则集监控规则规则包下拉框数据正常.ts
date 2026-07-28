// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1091",
  "title": "验证【规则集管理 ❯ 新建规则集 ❯ 监控规则 ❯】规则包下拉框数据正常",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则集管理】页面, 点击新增规则集",
      "expected": "进入【新建规则集 ❯ 基础信息】配置页面"
    },
    {
      "action": "正常配置基础信息内容, 点击下一步",
      "expected": "进入监控规则配置页面"
    },
    {
      "action": "展开规则包下拉框",
      "expected": "下拉框数据为基础信息配置页面中添加的规则包名称"
    },
    {
      "action": "选择规则包rule01, 点击增加",
      "expected": "新增一个规则包模块"
    },
    {
      "action": "检查规则包下拉框数据",
      "expected": "已选择过的规则包(rule01)不支持再次选择"
    }
  ]
} as const;

test.describe("验证【规则集管理 ❯ 新建规则集 ❯ 监控规则 ❯】规则包下拉框数据正常", () => {
  test("C1091 验证【规则集管理 ❯ 新建规则集 ❯ 监控规则 ❯】规则包下拉框数据正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
