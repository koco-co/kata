// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C373",
  "title": "验证【通用配置-json格式校验管理】key名搜索、数据源类型筛选与分页正常",
  "steps": [
    {
      "action": "进入【数据质量 → 通用配置 → json格式校验管理】页面",
      "expected": "1)页面展示「导 入」「导 出」「新 增」按钮\n2)列表列包含「key」「中文名称」「value格式」「数据源类型」「创建人」「创建时间」「更新人」「更新时间」「操作」"
    },
    {
      "action": "在「请输入key名称查询」输入关键字并切换数据源类型，翻页查看结果",
      "expected": "1)列表仅展示命中的 key 及其子层级\n2)数据源类型筛选生效\n3)分页总数与筛选结果一致"
    }
  ]
} as const;

test.describe("验证【通用配置-json格式校验管理】key名搜索、数据源类型筛选与分页正常", () => {
  test("C373 验证【通用配置-json格式校验管理】key名搜索、数据源类型筛选与分页正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
