// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1232",
  "title": "验证【「数据标准」-「标准管理」新增「落标检查」版块】「标准管理」-「落标检查」-「落标检查任务」-「编辑检查任务」-「检查任务详情」页面交互",
  "steps": [
    {
      "action": "进入【资产】-【数据标准】-【标准管理】-【落标检查】页面",
      "expected": "进入成功"
    },
    {
      "action": "在【落标检查任务】页面找到【test】表，点击【test】",
      "expected": "弹出【test】表详情页面"
    },
    {
      "action": "点击【检查字段列表】-[分页栏]功能",
      "expected": "点击 [上一页] 切换【检查字段列表】至上一分页内容，当当前页数为1时无点击动作且鼠标悬浮无变化"
    },
    {
      "action": "点击【检查结果总览】-[分页栏]功能",
      "expected": "点击 [上一页] 切换【检查结果总览】至上一分页内容，当当前页数为1时无点击动作且鼠标悬浮无变化"
    }
  ]
} as const;

test.describe("验证【「数据标准」-「标准管理」新增「落标检查」版块】「标准管理」-「落标检查」-「落标检查任务」-「编辑检查任务」-「检查任务详情」页面交互", () => {
  test("C1232 验证【「数据标准」-「标准管理」新增「落标检查」版块】「标准管理」-「落标检查」-「落标检查任务」-「编辑检查任务」-「检查任务详情」页面交互", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
