// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C391",
  "title": "验证数据权限-「新增/编辑」-数据权限配置交互",
  "steps": [
    {
      "action": "查看“表级权限”",
      "expected": "1）必填\n2）下拉选项：全部、ddl、dql、dml\n3）支持多选"
    },
    {
      "action": "“表级权限”选择包含“dql”或“dml”",
      "expected": "显示“是否开启行列权限配置”开关"
    },
    {
      "action": "“表级权限”选择不包含“dql”和“dml”",
      "expected": "隐藏“是否开启行列权限配置”开关"
    },
    {
      "action": "查看“是否开启行列权限配置”开关 hover提示",
      "expected": "提示：若不配置默认拥有该表的所有行列级权限，配置后仅针对配置的规则开放行列级权限"
    }
  ]
} as const;

test.describe("验证数据权限-「新增/编辑」-数据权限配置交互", () => {
  test("C391 验证数据权限-「新增/编辑」-数据权限配置交互", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
