// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1243",
  "title": "验证【「数据标准」-「标准管理」新增「落标检查」版块】最近编辑时间，最近检查时间取最新一次任务运行的结果",
  "steps": [
    {
      "action": "进入【资产】-【数据标准】-【标准管理】-【落标检查】页面",
      "expected": "进入成功"
    },
    {
      "action": "找到【test】表的落标检查，确认为开启检查状态，运行后确认最近编辑时间，最近检查时间",
      "expected": "一周期后数据更新，标准达标率、不达标字段数/检查失败数取最新一次任务运行的结果"
    }
  ]
} as const;

test.describe("验证【「数据标准」-「标准管理」新增「落标检查」版块】最近编辑时间，最近检查时间取最新一次任务运行的结果", () => {
  test("C1243 验证【「数据标准」-「标准管理」新增「落标检查」版块】最近编辑时间，最近检查时间取最新一次任务运行的结果", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
