// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C490",
  "title": "验证数据源删除-交互功能正确",
  "steps": [
    {
      "action": "数据源A只配置了元数据同步任务；",
      "expected": "删除按钮置灰"
    },
    {
      "action": "数据源A删除了所有元数据同步任务；",
      "expected": "删除按钮可用"
    },
    {
      "action": "数据源B只配置了质量校验规则；",
      "expected": "删除按钮置灰"
    },
    {
      "action": "数据源B删除了所有质量校验规则；",
      "expected": "删除按钮可用"
    },
    {
      "action": "数据源C配置了数据治理规则；",
      "expected": "删除按钮置灰"
    },
    {
      "action": "数据源C删除了所有数据治理规则；",
      "expected": "删除按钮可用"
    },
    {
      "action": "数据源D无元数据同步任务、质量校验规则任务、数据治理任务",
      "expected": "删除按钮可用"
    },
    {
      "action": "删除数据源D",
      "expected": "删除成功；列表刷新，不显示数据源D"
    },
    {
      "action": "删除数据源D后，进入引入数据源弹窗",
      "expected": "可以看到数据源D为待引入数据源"
    }
  ]
} as const;

test.describe("验证数据源删除-交互功能正确", () => {
  test("C490 验证数据源删除-交互功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
