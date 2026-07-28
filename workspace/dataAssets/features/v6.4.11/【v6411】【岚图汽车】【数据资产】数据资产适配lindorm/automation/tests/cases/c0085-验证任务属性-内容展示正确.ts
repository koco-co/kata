// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0085",
  "title": "验证【任务属性】-内容展示正确",
  "steps": [
    {
      "action": "点击表详情页右侧【任务属性】栏",
      "expected": "【责任人】【所属项目】【任务类型】【提交时间】信息展示正确"
    },
    {
      "action": "再次点击【任务属性】栏",
      "expected": "侧边栏收起"
    }
  ]
} as const;

test.describe("验证【任务属性】-内容展示正确", () => {
  test("C0085 验证【任务属性】-内容展示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
