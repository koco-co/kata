// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1180",
  "title": "验证【数据质量 通用配置-json格式校验管理 新增子层级】第5层级不显示新增子层级按钮",
  "steps": [
    {
      "action": "进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成",
      "expected": "json格式校验管理页面打开，列表显示已有key数据"
    },
    {
      "action": "逐层点击「+」展开，依次展开第1层 level1Root 到第4层 level4Node，找到第5层key为 level5Key 的记录，查看其操作列",
      "expected": "第5层 level5Key 记录的操作列中，仅显示【编辑】和【删除】按钮，不显示【新增子层级】按钮"
    }
  ]
} as const;

test.describe("验证【数据质量 通用配置-json格式校验管理 新增子层级】第5层级不显示新增子层级按钮", () => {
  test("C1180 验证【数据质量 通用配置-json格式校验管理 新增子层级】第5层级不显示新增子层级按钮", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
