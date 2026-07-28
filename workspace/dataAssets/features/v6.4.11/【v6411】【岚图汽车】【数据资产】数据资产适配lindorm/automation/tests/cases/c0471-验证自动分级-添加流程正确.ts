// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0471",
  "title": "验证自动分级-添加流程正确",
  "steps": [
    {
      "action": "点击自动分级页面的「添加」icon",
      "expected": "跳转至添加规则的基础信息页面"
    },
    {
      "action": "填写必填内容，点击下一步",
      "expected": "跳转至配置规则页面"
    },
    {
      "action": "选择${DATASOURCE_TYPE}数据源类型，填写其他必填内容，点击立即生效",
      "expected": "该数据源类型的符合识别规则的字段被分级成功"
    }
  ]
} as const;

test.describe("验证自动分级-添加流程正确", () => {
  test("C0471 验证自动分级-添加流程正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
