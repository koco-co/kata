// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1176",
  "title": "验证【数据质量 通用配置-json格式校验管理 搜索与筛选】数据源类型筛选功能",
  "steps": [
    {
      "action": "进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成",
      "expected": "json格式校验管理页面打开，列表显示已有key数据"
    },
    {
      "action": "在数据源类型筛选器中选择 SparkThrift，等待筛选结果返回",
      "expected": "列表仅显示数据源类型为 SparkThrift的记录"
    },
    {
      "action": "清空筛选条件",
      "expected": "列表恢复显示所有记录"
    },
    {
      "action": "依次切换Hive、Doris",
      "expected": "筛选功能正常"
    }
  ]
} as const;

test.describe("验证【数据质量 通用配置-json格式校验管理 搜索与筛选】数据源类型筛选功能", () => {
  test("C1176 验证【数据质量 通用配置-json格式校验管理 搜索与筛选】数据源类型筛选功能", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
