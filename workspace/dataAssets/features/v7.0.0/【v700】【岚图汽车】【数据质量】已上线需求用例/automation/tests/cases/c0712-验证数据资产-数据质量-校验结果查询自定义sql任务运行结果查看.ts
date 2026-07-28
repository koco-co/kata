// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0712",
  "title": "验证【「数据资产」-「数据质量」-「校验结果查询」】自定义sql任务运行结果查看",
  "steps": [
    {
      "action": "查看监控报告",
      "expected": "支持校验未通过（数量）、校验通过（数量）tab切换"
    },
    {
      "action": "选中校验未通过「数量」tab",
      "expected": "根据自定义配置时的分类展示，正确显示：完整性（自定义sql)，显示正确"
    },
    {
      "action": "查看sql显示替换了参数信息之后的完整sql内容",
      "expected": "SQl展示完整正确；SELECT COUNT(*)\nFROM car_order\nWHERE (\nUNIX_TIMESTAMP(end_time1) - UNIX_TIMESTAMP(start_time1)\n) > 60;"
    },
    {
      "action": "点击查看明细",
      "expected": "成功打开明细弹框，明细内容正确，明细列表展示不符合要求的2条数据，展示数据表内的全部字段"
    },
    {
      "action": "支持通过运行时间筛选",
      "expected": "筛选结果正确"
    },
    {
      "action": "若配置规则时选择\"校验字段\"：end_time1、start_time1",
      "expected": "明细表end_time1、start_time1标红展示，显示正确"
    },
    {
      "action": "点击下载明细",
      "expected": "受筛选条件影响，下载成功，下载结果正确，校验字段标红"
    }
  ]
} as const;

test.describe("验证【「数据资产」-「数据质量」-「校验结果查询」】自定义sql任务运行结果查看", () => {
  test("C0712 验证【「数据资产」-「数据质量」-「校验结果查询」】自定义sql任务运行结果查看", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
