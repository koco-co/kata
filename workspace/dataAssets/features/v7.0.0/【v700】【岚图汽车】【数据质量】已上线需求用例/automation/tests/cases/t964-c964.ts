// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C964",
  "title": "验证【「已配置报告」】「新建报告」-关联数据表数量上限",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【数据质量报告】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击「新建报告」按钮",
      "expected": "弹出「新建报告」弹窗"
    },
    {
      "action": "配置「关联数据表」中的数据",
      "expected": "支持选择多个数据源下面的多个库表，表范围为配置过质量规则的数据表，未配置的表不展示(规则任务管理)"
    },
    {
      "action": "依次配置30个数据表",
      "expected": "配置成功"
    },
    {
      "action": "配置第31个数据表",
      "expected": "关联失败, 提示: 配置表数量超限，最大支持添加30个数据表"
    }
  ]
} as const;

test.describe("验证【「已配置报告」】「新建报告」-关联数据表数量上限", () => {
  test("C964 验证【「已配置报告」】「新建报告」-关联数据表数量上限", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
