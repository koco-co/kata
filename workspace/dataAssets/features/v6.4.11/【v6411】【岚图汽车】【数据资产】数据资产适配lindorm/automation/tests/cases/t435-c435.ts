// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C435",
  "title": "验证数据脱敏-脱敏白名单-血缘表白名单不生效逻辑正确",
  "steps": [
    {
      "action": "表A同时配置了脱敏规则和脱敏白名单；\n表B未配置脱敏规则和脱敏白名单；\n表A脱敏规则开启了血缘（血缘启动状态）；\n分别查看表A和表B的数据预览",
      "expected": "表A脱敏规则未生效；\n表B脱敏规则生效"
    }
  ]
} as const;

test.describe("验证数据脱敏-脱敏白名单-血缘表白名单不生效逻辑正确", () => {
  test("C435 验证数据脱敏-脱敏白名单-血缘表白名单不生效逻辑正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
