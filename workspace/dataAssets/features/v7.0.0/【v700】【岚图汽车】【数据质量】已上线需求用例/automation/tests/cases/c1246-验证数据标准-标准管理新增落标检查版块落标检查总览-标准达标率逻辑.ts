// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1246",
  "title": "验证【「数据标准」-「标准管理」新增「落标检查」版块】「落标检查总览」-「标准达标率」逻辑",
  "steps": [
    {
      "action": "进入【数据标准】-【标准管理】-【落标检查】",
      "expected": "成功进入"
    },
    {
      "action": "根据统计逻辑，检查【落标检查总览】-【标准达标率】统计结果",
      "expected": "达标字段/检查字段总数*100%，取两位小数。统计数据准确，符合统计逻辑"
    }
  ]
} as const;

test.describe("验证【「数据标准」-「标准管理」新增「落标检查」版块】「落标检查总览」-「标准达标率」逻辑", () => {
  test("C1246 验证【「数据标准」-「标准管理」新增「落标检查」版块】「落标检查总览」-「标准达标率」逻辑", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
