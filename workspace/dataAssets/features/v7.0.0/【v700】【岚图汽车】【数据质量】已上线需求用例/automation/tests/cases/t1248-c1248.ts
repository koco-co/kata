// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1248",
  "title": "验证【「数据标准」-「标准管理」新增「落标检查」版块】「落标检查总览」-「标准字段数/标准达标率」取最新记录作统计数据",
  "steps": [
    {
      "action": "进入【资产】-【数据标准】-【标准管理】-【落标检查】页面",
      "expected": "进入成功"
    },
    {
      "action": "确认当前已建立任务列表中，存在 [多次检查] 的情况，手动统计标准字段数/标准达标率，与总计数据进行核对",
      "expected": "实现取最新记录作统计数据"
    }
  ]
} as const;

test.describe("验证【「数据标准」-「标准管理」新增「落标检查」版块】「落标检查总览」-「标准字段数/标准达标率」取最新记录作统计数据", () => {
  test("C1248 验证【「数据标准」-「标准管理」新增「落标检查」版块】「落标检查总览」-「标准字段数/标准达标率」取最新记录作统计数据", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
