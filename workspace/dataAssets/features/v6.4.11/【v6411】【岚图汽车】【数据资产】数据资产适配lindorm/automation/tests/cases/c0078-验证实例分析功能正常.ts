// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0078",
  "title": "验证【实例分析】功能正常",
  "steps": [
    {
      "action": "点击表详情【实例分析】按钮",
      "expected": "展示当前任务【近7天】实例详情"
    },
    {
      "action": "点击【近1个月】",
      "expected": "展示当前任务【近1个月】实例详情"
    },
    {
      "action": "点击【近半年】",
      "expected": "展示当前任务【近半年】实例详情"
    },
    {
      "action": "点击【近1年】",
      "expected": "展示当前任务【近1年】实例详情"
    },
    {
      "action": "空白页校验",
      "expected": "展示“暂无数据”"
    }
  ]
} as const;

test.describe("验证【实例分析】功能正常", () => {
  test("C0078 验证【实例分析】功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
