// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0090",
  "title": "验证【API属性】-内容展示正确",
  "steps": [
    {
      "action": "点击表详情页右侧【API属性】栏",
      "expected": "【创建用户】【所属项目】【API类型】【近30天调用次数】信息展示正确"
    },
    {
      "action": "再次点击【API属性】栏",
      "expected": "侧边栏收起"
    }
  ]
} as const;

test.describe("验证【API属性】-内容展示正确", () => {
  test("C0090 验证【API属性】-内容展示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
