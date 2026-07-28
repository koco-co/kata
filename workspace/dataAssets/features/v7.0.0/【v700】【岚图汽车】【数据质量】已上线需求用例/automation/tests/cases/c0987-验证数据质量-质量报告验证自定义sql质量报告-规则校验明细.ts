// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0987",
  "title": "验证【数据质量-质量报告】验证自定义sql质量报告-规则校验明细",
  "steps": [
    {
      "action": "查看质量报告-规则校验明细",
      "expected": "列表显示：规则类型 规则名称 字段名称 字段类型 质检结果 未通过原因 详情说明 操作"
    },
    {
      "action": "查看规则类型",
      "expected": "根据自定义配置时的分类展示，正确显示：完整性（自定义sql)，显示正确"
    },
    {
      "action": "查看规则名称悬浮内容，鼠标覆盖",
      "expected": "正确显示规则描述；规则描述同步变更"
    },
    {
      "action": "查看字段名称，若配置规则时选择校验字段信息：end_time1、start_time1",
      "expected": "显示字段end_time1、start_time1，显示正确"
    },
    {
      "action": "查看字段名称，若配置规则时选择校验字段信息\"：为空",
      "expected": "展位符--，显示正确"
    },
    {
      "action": "查看字段类型",
      "expected": "根据字段类型展示，显示正确"
    },
    {
      "action": "查看未通过原因，质量结果为校验通过",
      "expected": "未通过原因为空展示--"
    },
    {
      "action": "查看未通过原因，质量结果为校验失败",
      "expected": "未通过原因显示\"规则名称+未通过\""
    },
    {
      "action": "查看详情说明，质量结果为校验通过",
      "expected": "详情说明显示：查询结果的数据量为0，符合规则\"期望值：<=0\""
    },
    {
      "action": "查看详情说明，质量结果为校验失败",
      "expected": "详情说明显示：查询结果的数据量为2（根据完整SQl查询来），不符合规则\"期望值：<=0\""
    }
  ]
} as const;

test.describe("验证【数据质量-质量报告】验证自定义sql质量报告-规则校验明细", () => {
  test("C0987 验证【数据质量-质量报告】验证自定义sql质量报告-规则校验明细", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
