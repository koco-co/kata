// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1316",
  "title": "验证【数据标准映射功能调整】「标准管理」-「标准映射」-「映射记录」超10000条时展示前10000条",
  "steps": [
    {
      "action": "进入【标准管理】-【标准映射】",
      "expected": "进入成功"
    },
    {
      "action": "找到【test】记录，点击对应的【映射记录】（超10000条记录）按钮",
      "expected": "弹出[映射记录]详情页面"
    },
    {
      "action": "UI Check",
      "expected": "在【映射记录】列表中展示了前10000条记录"
    }
  ]
} as const;

test.describe("验证【数据标准映射功能调整】「标准管理」-「标准映射」-「映射记录」超10000条时展示前10000条", () => {
  test("C1316 验证【数据标准映射功能调整】「标准管理」-「标准映射」-「映射记录」超10000条时展示前10000条", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
