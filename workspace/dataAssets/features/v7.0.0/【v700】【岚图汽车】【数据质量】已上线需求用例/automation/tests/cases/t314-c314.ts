// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C314",
  "title": "验证「手动关联离线任务-周期调度时间变更」-质量任务同步需编辑生效功能正确",
  "steps": [
    {
      "action": "进入「数据质量」-「规则任务管理」页面",
      "expected": "进入成功"
    },
    {
      "action": "选择规则A，编辑进入「调度属性」配置页面",
      "expected": "进入成功"
    },
    {
      "action": "「调度周期」选择「手动关联离线任务周期」",
      "expected": "选择成功"
    },
    {
      "action": "「质量任务周期」选择「天」，「生效日期」选择为「2025-11-01～2025-12-01」 具体时间为「13:00」",
      "expected": "配置成功"
    },
    {
      "action": "「任务关联」添加离线任务A",
      "expected": "关联离线任务成功"
    },
    {
      "action": "触发离线任务A实例运行",
      "expected": "在离线任务调度后，质量任务能够正常调度"
    },
    {
      "action": "编辑离线任务，设置调度周期为小时任务，每隔一个小时运行一次",
      "expected": "变更成功"
    },
    {
      "action": "不编辑规则，等待质量调度",
      "expected": "质量任务调度时刻仍为之前的时刻"
    },
    {
      "action": "编辑规则，直接保存",
      "expected": "保存成功"
    },
    {
      "action": "触发离线任务A实例运行",
      "expected": "质量任务调度时刻调整（根据离线最后一个实例的调度时刻-更新质量任务实例的调度时刻）"
    }
  ]
} as const;

test.describe("验证「手动关联离线任务-周期调度时间变更」-质量任务同步需编辑生效功能正确", () => {
  test("C314 验证「手动关联离线任务-周期调度时间变更」-质量任务同步需编辑生效功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
