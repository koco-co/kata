// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0225",
  "title": "验证数据质量规范性校验限制条数校验功能正确",
  "steps": [
    {
      "action": "删除第十条规则，重新新增规则",
      "expected": "可以正常新增规则函数"
    },
    {
      "action": "新增规范性校验任务，不引用标准规则，配置超过10条规则",
      "expected": "在配置第11条规则时无法进行配置"
    }
  ]
} as const;

test.describe("验证数据质量规范性校验限制条数校验功能正确", () => {
  test("C0225 验证数据质量规范性校验限制条数校验功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
