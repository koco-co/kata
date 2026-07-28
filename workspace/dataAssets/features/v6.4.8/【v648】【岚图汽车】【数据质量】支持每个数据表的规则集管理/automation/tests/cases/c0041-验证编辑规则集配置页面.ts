// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0041",
  "title": "验证编辑规则集配置页面",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则集管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "选择规则集记录rule01, 点击编辑",
      "expected": "进入【编辑规则集 ❯ 基础信息】配置页面, 所有字段均可编辑"
    },
    {
      "action": "基础信息UICHECK",
      "expected": "1) 选择数据表: ${最近一次编辑保存时的配置记录}2) 规则包: ${最近一次编辑保存时的规则包名称}3) 按钮: 取消/下一步"
    },
    {
      "action": "点击下一步",
      "expected": "进入【编辑规则集 ❯ 监控规则】配置页面"
    },
    {
      "action": "监控规则UICHECK",
      "expected": "1) 规则包&校验规则: ${最近一次编辑保存时的规则包&校验规则}2) 按钮: 下一步/保存"
    }
  ]
} as const;

test.describe("验证编辑规则集配置页面", () => {
  test("C0041 验证编辑规则集配置页面", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
