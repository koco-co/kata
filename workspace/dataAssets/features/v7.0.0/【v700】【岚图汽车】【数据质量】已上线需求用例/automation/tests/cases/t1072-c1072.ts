// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1072",
  "title": "验证「数据质量-总览」-「数据质量概览」展示正确",
  "steps": [
    {
      "action": "进入【资产-数据质量-总览】页面",
      "expected": "页面正常进入"
    },
    {
      "action": "查看【数据质量概览】板块",
      "expected": "包含规则数、规则集总数、规则任务数、校验通过数/校验异常数"
    },
    {
      "action": "查看规则数",
      "expected": "标题右上角显示\"？\"，悬浮提示：\"统计规则库中内置规则和自定义正则总数\"；\n下方展示数量：100"
    },
    {
      "action": "查看规则集总数",
      "expected": "下方显示数量：100"
    },
    {
      "action": "查看规则任务数",
      "expected": "下方显示数量：100"
    },
    {
      "action": "查看校验通过数/校验异常数",
      "expected": "右上角显示\"？\"，悬浮提示：\"取每个任务的最新一次校验结果统计校验通过数/校验异常数\"；\n下方展示数量：100/50"
    },
    {
      "action": "新增任一规则任务，内含3条子规则，使其2条通过，1条不通过",
      "expected": "新增成功"
    },
    {
      "action": "立即执行规则",
      "expected": "执行成功，2条通过，1条不通过"
    },
    {
      "action": "等待小时更新，查看【数据质量概览-校验通过数/校验异常数】数量统计",
      "expected": "更新为102/51"
    },
    {
      "action": "删除某一规则，该规则内含5条通过子规则，5条不通过子规则",
      "expected": "删除成功"
    },
    {
      "action": "等待小时更新，查看【数据质量概览-校验通过数/校验异常数】数量统计",
      "expected": "更新为97/46"
    }
  ]
} as const;

test.describe("验证「数据质量-总览」-「数据质量概览」展示正确", () => {
  test("C1072 验证「数据质量-总览」-「数据质量概览」展示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
