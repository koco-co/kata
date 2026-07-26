// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C018",
  "title": "验证数据标准-查看详情",
  "steps": [
    {
      "action": "点击标准的标准名称",
      "expected": "1）右侧标准详情抽屉的弹出\n2）头部显示标准中文名、发布状态、创建时间、最近发布时间、最近发布用户\n3）tab页显示“标准信息”和“版本变更”"
    }
  ]
} as const;

test.describe("验证数据标准-查看详情", () => {
  test("C018 验证数据标准-查看详情", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
