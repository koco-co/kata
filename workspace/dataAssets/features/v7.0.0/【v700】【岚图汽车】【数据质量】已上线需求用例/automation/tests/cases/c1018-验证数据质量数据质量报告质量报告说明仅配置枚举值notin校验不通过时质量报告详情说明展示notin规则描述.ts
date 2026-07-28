// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1018",
  "title": "验证【数据质量 数据质量报告 质量报告说明】仅配置枚举值not in校验不通过时质量报告详情说明展示not in规则描述",
  "steps": [
    {
      "action": "进入【数据质量 → 数据质量报告】页面，等待报告列表加载完成",
      "expected": "质量报告页面打开，报告列表加载完成"
    },
    {
      "action": "找到任务 task_15695_enum_notin_fail 对应的枚举值规则行，查看详情说明列内容",
      "expected": "详情说明列中规则描述部分显示「枚举值not in '4,5'」，约定范围外的值数量统计准确，操作列显示【查看详情】链接"
    }
  ]
} as const;

test.describe("验证【数据质量 数据质量报告 质量报告说明】仅配置枚举值not in校验不通过时质量报告详情说明展示not in规则描述", () => {
  test("C1018 验证【数据质量 数据质量报告 质量报告说明】仅配置枚举值not in校验不通过时质量报告详情说明展示not in规则描述", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
