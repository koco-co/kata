// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1020",
  "title": "验证【数据质量 数据质量报告 质量报告说明】仅配置枚举值in校验通过时质量报告详情说明使用枚举值独立说明模板",
  "steps": [
    {
      "action": "进入【数据质量 → 数据质量报告】页面，等待报告列表加载完成",
      "expected": "质量报告页面打开，报告列表加载完成"
    },
    {
      "action": "找到任务 task_15695_enum_pass 对应的枚举值规则行，查看详情说明列内容",
      "expected": "详情说明列显示「字段枚举值不存在约定范围外的值，符合规则\"枚举值in '1,2,3'\"」，不显示取值范围相关说明"
    }
  ]
} as const;

test.describe("验证【数据质量 数据质量报告 质量报告说明】仅配置枚举值in校验通过时质量报告详情说明使用枚举值独立说明模板", () => {
  test("C1020 验证【数据质量 数据质量报告 质量报告说明】仅配置枚举值in校验通过时质量报告详情说明使用枚举值独立说明模板", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
