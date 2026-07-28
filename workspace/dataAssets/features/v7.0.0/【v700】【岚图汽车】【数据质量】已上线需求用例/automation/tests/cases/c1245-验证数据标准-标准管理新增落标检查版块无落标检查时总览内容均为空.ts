// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1245",
  "title": "验证【「数据标准」-「标准管理」新增「落标检查」版块】无落标检查时，总览内容均为空",
  "steps": [
    {
      "action": "进入【资产】-【数据标准】-【标准管理】-【标准定义】页面",
      "expected": "进入成功"
    },
    {
      "action": "检查【落标检查总览】-【检查数据表】统计结果",
      "expected": "统计数据数据为空"
    }
  ]
} as const;

test.describe("验证【「数据标准」-「标准管理」新增「落标检查」版块】无落标检查时，总览内容均为空", () => {
  test("C1245 验证【「数据标准」-「标准管理」新增「落标检查」版块】无落标检查时，总览内容均为空", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
