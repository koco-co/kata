// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0043",
  "title": "验证【完整性校验】字段变更(规则类型 ❯ 生效范围)",
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
      "action": "添加【完整性校验】, 检查配置字段",
      "expected": "原配置字段名称(规则类型)变更为: 生效范围"
    }
  ]
} as const;

test.describe("验证【完整性校验】字段变更(规则类型 ❯ 生效范围)", () => {
  test("C0043 验证【完整性校验】字段变更(规则类型 ❯ 生效范围)", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
