// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0437",
  "title": "验证数据脱敏-脱敏白名单-新增库/表自动脱敏功能正确",
  "steps": [
    {
      "action": "1）准备一条白名单记录配置如下：\n\t数据源：datasourceA \n\t数据库：schemaA1 \n\t数据表：全部\n\n2）同步schemaA1下一张新表（tableA2）至数据地图\n\n3）为tableA2配置脱敏规则\n\n4）查看tableA2的数据预览",
      "expected": "tableA2的脱敏规则未生效"
    },
    {
      "action": "1）准备一条白名单记录配置如下：\n\t数据源：datasourceA \n\t数据库：全部\n\t数据表：全部\n\n2）同步schemaA2（之前未同步过）下一张新表（tableA3）至数据地图\n\n3）为tableA3配置脱敏规则\n\n4）查看tableA3的数据预览",
      "expected": "tableA3的脱敏规则未生效"
    }
  ]
} as const;

test.describe("验证数据脱敏-脱敏白名单-新增库/表自动脱敏功能正确", () => {
  test("C0437 验证数据脱敏-脱敏白名单-新增库/表自动脱敏功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
