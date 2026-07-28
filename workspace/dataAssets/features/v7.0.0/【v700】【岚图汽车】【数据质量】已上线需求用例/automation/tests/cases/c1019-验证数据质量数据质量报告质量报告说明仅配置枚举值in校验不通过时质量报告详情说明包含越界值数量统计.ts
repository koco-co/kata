// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1019",
  "title": "验证【数据质量 数据质量报告 质量报告说明】仅配置枚举值in校验不通过时质量报告详情说明包含越界值数量统计",
  "steps": [
    {
      "action": "进入【数据质量 → 数据质量报告】页面，等待报告列表加载完成",
      "expected": "质量报告页面打开，报告列表加载完成"
    },
    {
      "action": "找到任务 task_15695_enum_fail 对应的枚举值规则行，查看详情说明列内容",
      "expected": "详情说明列显示「字段枚举值存在约定范围外的值，约定范围外的值的数量总计为2个，不符合规则\"枚举值in '1,2,3'\"」，操作列显示【查看详情】链接"
    }
  ]
} as const;

test.describe("验证【数据质量 数据质量报告 质量报告说明】仅配置枚举值in校验不通过时质量报告详情说明包含越界值数量统计", () => {
  test("C1019 验证【数据质量 数据质量报告 质量报告说明】仅配置枚举值in校验不通过时质量报告详情说明包含越界值数量统计", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
