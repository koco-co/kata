// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0383",
  "title": "验证「调度属性」页面新增「超时时间」",
  "steps": [
    {
      "action": "进入「资产-【数据资产】-【数据质量】-【规则任务管理】-调度属性」页面",
      "expected": "页面正常打开"
    },
    {
      "action": "查看页面",
      "expected": "1）「调度配置」区域新增「超时时间」\n2）可选择「不限制」和「自定义」"
    }
  ]
} as const;

test.describe("验证「调度属性」页面新增「超时时间」", () => {
  test("C0383 验证「调度属性」页面新增「超时时间」", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
