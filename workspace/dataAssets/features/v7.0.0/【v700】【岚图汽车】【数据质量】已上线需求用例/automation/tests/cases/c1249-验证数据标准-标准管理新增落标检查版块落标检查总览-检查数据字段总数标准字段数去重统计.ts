// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1249",
  "title": "验证【「数据标准」-「标准管理」新增「落标检查」版块】「落标检查总览」-「检查数据字段总数/标准字段数」去重统计",
  "steps": [
    {
      "action": "进入【资产】-【数据标准】-【标准管理】-【落标检查】页面",
      "expected": "进入成功"
    },
    {
      "action": "确认当前已建立任务列表中，存在 [对同一字段多次检查] 的情况，手动统计检查数据字段总数/标准字段数实际情况，与总计数据进行核对",
      "expected": "实现去重统计"
    }
  ]
} as const;

test.describe("验证【「数据标准」-「标准管理」新增「落标检查」版块】「落标检查总览」-「检查数据字段总数/标准字段数」去重统计", () => {
  test("C1249 验证【「数据标准」-「标准管理」新增「落标检查」版块】「落标检查总览」-「检查数据字段总数/标准字段数」去重统计", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
