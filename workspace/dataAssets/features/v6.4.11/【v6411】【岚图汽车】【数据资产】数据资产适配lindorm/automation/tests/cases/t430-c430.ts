// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C430",
  "title": "验证数据脱敏-脱敏白名单-应用功能正确",
  "steps": [
    {
      "action": "位置：「数据安全」-「数据脱敏管理」-「脱敏规则配置」\n新增一条脱敏规则，其脱敏表包含表A、表B、表C\n\n位置：「数据安全」-「数据脱敏管理」-「脱敏白名单」\n新增一条脱敏白名单，数据库为表A所属数据库，数据表为全部表\n\n位置：「元数据」-「数据地图」-表A详情页-「数据预览」\n查看表A的数据预览",
      "expected": "表A的脱敏规则不生效；\n表B的脱敏规则不生效；\n表C的脱敏规则生效"
    },
    {
      "action": "位置：「数据安全」-「数据脱敏管理」-「脱敏规则配置」\n新增一条脱敏规则，其脱敏表包含表A、表B、表C\n\n位置：「数据安全」-「数据脱敏管理」-「脱敏白名单」\n新增一条脱敏白名单，数据源为表A所属数据源，数据库为全部库，数据表为全部表\n\n位置：「元数据」-「数据地图」-表A详情页-「数据预览」\n查看表A的数据预览",
      "expected": "表A的脱敏规则不生效；\n表B的脱敏规则不生效；\n表C的脱敏规则不生效"
    }
  ]
} as const;

test.describe("验证数据脱敏-脱敏白名单-应用功能正确", () => {
  test("C430 验证数据脱敏-脱敏白名单-应用功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
