// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C015",
  "title": "验证执行含取值范围&枚举范围且关系规则的任务后质量报告展示正确",
  "steps": [
    {
      "action": "进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成",
      "expected": "规则任务管理页面正常打开，列表加载完成，无报错"
    },
    {
      "action": "在规则任务列表中点击任务 task_15695_and 对应行的【执行】按钮，等待任务状态变更为【执行成功】（最长等待 120 秒）",
      "expected": "任务状态列显示「执行成功」"
    },
    {
      "action": "点击任务 task_15695_and 对应行的【质量报告】入口，在质量报告列表中找到规则名称为【取值范围&枚举范围】、字段为 score 的报告行，查看各列内容",
      "expected": "质量报告中该规则行显示如下：\n1) 规则类型列显示「有效性校验」\n2) 规则名称列显示「取值范围&枚举范围」\n3) 质检结果列显示「校验不通过」\n4) 未通过原因列显示「不符合有效性规则」\n5) 详情说明列显示「不符合规则\"取值范围>1\"且\"枚举值in '1,2,3'\"」\n6) 操作列显示【查看详情】链接"
    },
    {
      "action": "切换至 doris3.x 数据源，按相同表、规则包和配置重复以上步骤。",
      "expected": "切换至 doris3.x 数据源重复以上步骤后，规则任务创建、执行、结果展示与 sparkthrift2.x 场景一致。"
    }
  ]
} as const;

test.describe("验证执行含取值范围&枚举范围且关系规则的任务后质量报告展示正确", () => {
  test("C015 验证执行含取值范围&枚举范围且关系规则的任务后质量报告展示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
