// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1327",
  "title": "验证【数据标准映射功能调整】「标准管理」-「标准定义」-「标准上线」提示内容调整",
  "steps": [
    {
      "action": "进入【资产】-【数据标准】-【标准管理】-【标准定义】页面",
      "expected": "进入成功"
    },
    {
      "action": "找到【test】标准，点击对应【上线按钮】按钮",
      "expected": "弹出提示框\"数据标准上线后，支持在标准映射中选择已上线的标准进行映射\""
    }
  ]
} as const;

test.describe("验证【数据标准映射功能调整】「标准管理」-「标准定义」-「标准上线」提示内容调整", () => {
  test("C1327 验证【数据标准映射功能调整】「标准管理」-「标准定义」-「标准上线」提示内容调整", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
