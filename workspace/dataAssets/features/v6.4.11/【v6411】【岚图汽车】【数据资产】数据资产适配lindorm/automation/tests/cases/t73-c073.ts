// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C073",
  "title": "验证【业务属性】-内容展示正确",
  "steps": [
    {
      "action": "点击表详情页右侧【业务属性】栏",
      "expected": "【负责人】【表中文名】信息展示正确"
    },
    {
      "action": "同步表时，指定负责人为tester，同步",
      "expected": "同步成功后，表负责人变更为tester"
    },
    {
      "action": "表comment修改为“test”，同步表",
      "expected": "表中文名变更为“test”"
    },
    {
      "action": "再次点击表详情页右侧【业务属性】栏",
      "expected": "侧边栏收起"
    }
  ]
} as const;

test.describe("验证【业务属性】-内容展示正确", () => {
  test("C073 验证【业务属性】-内容展示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
