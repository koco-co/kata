// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0040",
  "title": "验证选择数据表配置功能正常",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则集管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "选择规则集记录rule01, 点击编辑",
      "expected": "进入【编辑规则集 ❯ 基础信息】配置页面"
    },
    {
      "action": "切换选择数据源配置后, 正常配置规则集并保存",
      "expected": "配置成功"
    },
    {
      "action": "切换选择数据库配置后, 正常配置规则集并保存",
      "expected": "配置成功"
    },
    {
      "action": "切换选择数据表配置后, 正常配置规则集并保存",
      "expected": "配置成功"
    },
    {
      "action": "切换选择规则集描述后, 正常配置规则集并保存",
      "expected": "配置成功"
    }
  ]
} as const;

test.describe("验证选择数据表配置功能正常", () => {
  test("C0040 验证选择数据表配置功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
