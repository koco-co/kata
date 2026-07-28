// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1252",
  "title": "验证【「数据标准」-「标准管理」新增「落标检查」版块】「标准管理」-「落标检查」-落标检查总览页面内容",
  "steps": [
    {
      "action": "进入【资产】-【数据标准】-【标准管理】-【标准定义】页面",
      "expected": "进入成功"
    },
    {
      "action": "UI Check",
      "expected": "【落标检查总览】\n[检查数据表][检查字段总数][达标字段数][标准达标率]\n以上内容正常显示"
    }
  ]
} as const;

test.describe("验证【「数据标准」-「标准管理」新增「落标检查」版块】「标准管理」-「落标检查」-落标检查总览页面内容", () => {
  test("C1252 验证【「数据标准」-「标准管理」新增「落标检查」版块】「标准管理」-「落标检查」-落标检查总览页面内容", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
