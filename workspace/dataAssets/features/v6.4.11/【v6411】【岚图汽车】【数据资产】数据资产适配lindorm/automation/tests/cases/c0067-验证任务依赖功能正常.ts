// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0067",
  "title": "验证【任务依赖】功能正常",
  "steps": [
    {
      "action": "点击表详情【任务依赖】按钮",
      "expected": "展示【离线任务】【实时任务】“任务名称”“任务类型”“和该表的关系”“负责人”"
    }
  ]
} as const;

test.describe("验证【任务依赖】功能正常", () => {
  test("C0067 验证【任务依赖】功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
