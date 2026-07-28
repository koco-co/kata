// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1247",
  "title": "验证【「数据标准」-「标准管理」新增「落标检查」版块】「落标检查总览」-「达标字段数」逻辑",
  "steps": [
    {
      "action": "进入【数据标准】-【标准管理】-【落标检查】",
      "expected": "成功进入"
    },
    {
      "action": "根据统计逻辑，检查【落标检查总览】-【达标字段数】统计结果",
      "expected": "落标检查的检查项有一项不达标则该字段默认为不达标字段，检查失败字段不计算在达标字段数内。统计数据准确，符合统计逻辑"
    }
  ]
} as const;

test.describe("验证【「数据标准」-「标准管理」新增「落标检查」版块】「落标检查总览」-「达标字段数」逻辑", () => {
  test("C1247 验证【「数据标准」-「标准管理」新增「落标检查」版块】「落标检查总览」-「达标字段数」逻辑", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
