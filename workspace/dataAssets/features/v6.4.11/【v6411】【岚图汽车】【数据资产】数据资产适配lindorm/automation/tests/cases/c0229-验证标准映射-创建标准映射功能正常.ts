// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0229",
  "title": "验证标准映射-创建标准映射功能正常",
  "steps": [
    {
      "action": "1）点击【标准映射】\n2）查看创建标准映射弹窗",
      "expected": "操作成功"
    },
    {
      "action": "“数据源类型”选择${DATASOURCE_TYPE}数据源类型",
      "expected": "“数据源”下拉项显示${DATASOURCE_TYPE}数据源类型下的数据源"
    },
    {
      "action": "“数据源”选择${DATASOURCE_TYPE}数据源类型下的数据源",
      "expected": "“数据库”下拉项显示所选数据源下所有已同步的数据库"
    },
    {
      "action": "1）选择数据库\n2）点击【添加】\n3）点击【确定】",
      "expected": "创建标准映射成功"
    }
  ]
} as const;

test.describe("验证标准映射-创建标准映射功能正常", () => {
  test("C0229 验证标准映射-创建标准映射功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
