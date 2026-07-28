// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1023",
  "title": "验证【数据质量 数据质量报告 质量报告-展示】 验证质量报告中校验通过行的各列展示内容正确",
  "steps": [
    {
      "action": "进入【数据质量 → 数据质量报告】页面，等待页面加载完成",
      "expected": "数据质量报告页面正常打开，报告列表加载完成"
    },
    {
      "action": "找到\"task_json_key_range_test\"，查看最新一次执行的报告详情",
      "expected": "报告详情页正常打开，数据加载完成"
    },
    {
      "action": "找到质检结果为\"校验通过\"的规则行，逐列查看各字段值",
      "expected": "该规则行各列展示正确：\n1) 规则类型列=完整性校验\n2) 规则名称列=key范围校验\n3) 字段类型列=json\n4) 质检结果=校验通过\n5) 未通过原因列=--\n6) 详情说明列=符合规则key范围包含\"key1-key2\"\n7) 操作列=--"
    }
  ]
} as const;

test.describe("验证【数据质量 数据质量报告 质量报告-展示】 验证质量报告中校验通过行的各列展示内容正确", () => {
  test("C1023 验证【数据质量 数据质量报告 质量报告-展示】 验证质量报告中校验通过行的各列展示内容正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
