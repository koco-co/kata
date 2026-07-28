// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0282",
  "title": "验证「我的模型」审批中页面的展示",
  "steps": [
    {
      "action": "点击数据模型tab下的「我的模型」",
      "expected": "跳转至「我的模型」已审批页面"
    },
    {
      "action": "点击「审批中」tab",
      "expected": "跳转至「我的模型」审批中页面；\n列表title显示为：表名，表中文名，动作，提交时间，操作；\n默认按照提交时间倒序"
    }
  ]
} as const;

test.describe("验证「我的模型」审批中页面的展示", () => {
  test("C0282 验证「我的模型」审批中页面的展示", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
