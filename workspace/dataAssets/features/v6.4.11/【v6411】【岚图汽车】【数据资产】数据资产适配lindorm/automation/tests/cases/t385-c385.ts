// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C385",
  "title": "验证数据权限-表级权限校验功能正常",
  "steps": [
    {
      "action": "在「数据安全-数据权限分配」配置表级权限为：ddl",
      "expected": "ddl选项能够保存成功"
    },
    {
      "action": "在「数据安全-数据权限分配」配置表级权限为：dql",
      "expected": "数据地图-数据预览能够查询到数据"
    },
    {
      "action": "在「数据安全-数据权限分配」配置表级权限为：dml",
      "expected": "dml选项能够保存成功"
    },
    {
      "action": "在「数据安全-数据权限分配」配置表级权限为：ddl、dql、dml",
      "expected": "1）ddl、dql、dml选项能够保存成功\n2）资产数据预览成功"
    }
  ]
} as const;

test.describe("验证数据权限-表级权限校验功能正常", () => {
  test("C385 验证数据权限-表级权限校验功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
