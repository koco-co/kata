// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C183",
  "title": "验证完整度分析-查询",
  "steps": [
    {
      "action": "触发完整度分析定时任务：\ncurl -X POST localhost:8875/dmetadata/v1/scheduleJob/saveFillRate",
      "expected": "任务执行成功未报错"
    },
    {
      "action": "查看“质量统计”，统计类型选择“表”",
      "expected": "“质量统计”显示${DATASOURCE_TYPE}数据源类型数据源的统计信息"
    },
    {
      "action": "查看“质量分析”，“分析方式”选择数据源",
      "expected": "列表数据显示${DATASOURCE_TYPE}数据源类型数据源的分析信息"
    },
    {
      "action": "查看“质量分析”，“分析方式”选择业务属性",
      "expected": "“元模型”筛选项显示正确"
    },
    {
      "action": "“元模型”选择待测数据源类型",
      "expected": "列表数据显示${DATASOURCE_TYPE}数据源类型元模型属性的分析信息"
    }
  ]
} as const;

test.describe("验证完整度分析-查询", () => {
  test("C183 验证完整度分析-查询", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
