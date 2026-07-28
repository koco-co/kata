// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1198",
  "title": "验证「平台管理」中 Doris 3.x 数据源质量项目授权功能正常",
  "steps": [
    {
      "action": "进入【数据资产】-【平台管理】-【数据源管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击「引入数据源」",
      "expected": "显示平台中所有还未被引入至资产平台的数据源"
    },
    {
      "action": "选择${datasource1}数据源后引入",
      "expected": "成功引入至资产平台"
    },
    {
      "action": "点击「质量项目授权」, 选择质量项目后确定",
      "expected": "1) 质量项目授权成功\n2) 资产平台其他模块都可以加载到该数据源"
    }
  ]
} as const;

test.describe("验证「平台管理」中 Doris 3.x 数据源质量项目授权功能正常", () => {
  test("C1198 验证「平台管理」中 Doris 3.x 数据源质量项目授权功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
