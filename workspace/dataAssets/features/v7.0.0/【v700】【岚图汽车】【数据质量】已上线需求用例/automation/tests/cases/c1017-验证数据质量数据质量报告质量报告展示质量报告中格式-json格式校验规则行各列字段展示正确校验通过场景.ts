// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1017",
  "title": "验证【数据质量 数据质量报告 质量报告展示】质量报告中「格式-json格式校验」规则行各列字段展示正确（校验通过场景）",
  "steps": [
    {
      "action": "进入【数据质量 → 数据质量报告】页面，等待页面加载完成",
      "expected": "数据质量报告页面正常打开，报告列表加载完成"
    },
    {
      "action": "找到「报告通过展示任务」最新一次执行的报告详情并打开",
      "expected": "报告详情页正常打开，数据加载完成"
    },
    {
      "action": "找到「格式-json格式校验」规则行，逐列核对各字段内容",
      "expected": "1) 规则类型列=「有效性校验」\n2) 规则名称列=「格式-json格式校验」\n3) 字段类型列=「json」\n4) 质检结果列=「校验通过」\n5) 未通过原因列=「--」\n6) 详情说明列=「符合规则key为\"meta-version\"时的value格式要求」\n7) 操作列无内容"
    }
  ]
} as const;

test.describe("验证【数据质量 数据质量报告 质量报告展示】质量报告中「格式-json格式校验」规则行各列字段展示正确（校验通过场景）", () => {
  test("C1017 验证【数据质量 数据质量报告 质量报告展示】质量报告中「格式-json格式校验」规则行各列字段展示正确（校验通过场景）", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
