// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0051",
  "title": "验证选择数据表配置功能正常",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则集管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击新增规则集",
      "expected": "进入【新建规则集 ❯ 基础信息】配置页面"
    },
    {
      "action": "配置选择数据源",
      "expected": "1)下拉显示在平台管理中已授权的数据源2)支持选择的数据源类型包括hive2.x/sparkthrift2.x/doris3.x"
    },
    {
      "action": "配置选择数据库",
      "expected": "下拉显示所选数据源下的数据库配置"
    },
    {
      "action": "配置选择数据表",
      "expected": "下拉显示所选数据库下的数据表配置, 已配置过规则的表被过滤"
    },
    {
      "action": "配置规则集描述",
      "expected": "规则集描述最大支持255字符, 超过会置红提示"
    }
  ]
} as const;

test.describe("验证选择数据表配置功能正常", () => {
  test("C0051 验证选择数据表配置功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
