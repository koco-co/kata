// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0736",
  "title": "验证【数据质量 校验结果查询 校验明细与日志】校验通过时不记录明细数据，查看详情入口不显示",
  "steps": [
    {
      "action": "进入【数据质量 → 校验结果查询】页面，等待页面加载完成",
      "expected": "校验结果查询页面正常打开，列表加载完成"
    },
    {
      "action": "找到「通过场景测试任务」最新实例记录并打开实例详情",
      "expected": "实例详情页面正常打开，数据加载完成"
    },
    {
      "action": "找到「格式-json格式校验」规则行，查看「质检结果」「未通过原因」「操作」列内容",
      "expected": "1) 「质检结果」列显示「校验通过」\n2) 「未通过原因」列显示「--」\n3) 「操作」列不显示「查看详情」链接"
    }
  ]
} as const;

test.describe("验证【数据质量 校验结果查询 校验明细与日志】校验通过时不记录明细数据，查看详情入口不显示", () => {
  test("C0736 验证【数据质量 校验结果查询 校验明细与日志】校验通过时不记录明细数据，查看详情入口不显示", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
