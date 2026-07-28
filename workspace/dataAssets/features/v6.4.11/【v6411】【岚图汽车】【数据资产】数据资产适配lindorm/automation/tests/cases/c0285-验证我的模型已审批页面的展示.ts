// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0285",
  "title": "验证「我的模型」已审批页面的展示",
  "steps": [
    {
      "action": "点击数据模型tab下的「我的模型」",
      "expected": "跳转至「我的模型」已审批页面；\n列表title显示为：表名，表中文名，动作，授权状态，审批人，提交时间，审批时间，操作；\n默认按照提交时间倒序"
    }
  ]
} as const;

test.describe("验证「我的模型」已审批页面的展示", () => {
  test("C0285 验证「我的模型」已审批页面的展示", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
