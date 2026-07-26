// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1325",
  "title": "验证【数据标准映射功能调整】「标准管理」-「标准映射」-「映射目标」支持选择到数据表",
  "steps": [
    {
      "action": "进入【标准管理】-【标准映射】",
      "expected": "进入成功"
    },
    {
      "action": "点击【标准映射】按钮",
      "expected": "进入[标准映射]配置页面"
    },
    {
      "action": "UI Check",
      "expected": "【映射目标】中层级为[数据源类型]-[数据源]-[数据库]-[数据表]"
    },
    {
      "action": "点击各级选择框",
      "expected": "弹出可选择的[数据源类型]-[数据源]-[数据库]-[数据表]"
    }
  ]
} as const;

test.describe("验证【数据标准映射功能调整】「标准管理」-「标准映射」-「映射目标」支持选择到数据表", () => {
  test("C1325 验证【数据标准映射功能调整】「标准管理」-「标准映射」-「映射目标」支持选择到数据表", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
