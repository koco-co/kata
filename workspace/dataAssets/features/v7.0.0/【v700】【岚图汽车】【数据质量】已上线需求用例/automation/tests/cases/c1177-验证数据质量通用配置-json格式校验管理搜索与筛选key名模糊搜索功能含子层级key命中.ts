// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1177",
  "title": "验证【数据质量 通用配置-json格式校验管理 搜索与筛选】key名模糊搜索功能（含子层级key命中）",
  "steps": [
    {
      "action": "进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成",
      "expected": "页面正常加载，列表显示所有第一层级数据"
    },
    {
      "action": "在搜索框中输入 orderInfo，等待搜索结果返回",
      "expected": "列表仅显示key包含 orderInfo 的第一层级记录，key名称中不含 orderInfo 的记录均不显示"
    },
    {
      "action": "清空搜索框，重新输入 orderStatus（子层级key名），等待搜索结果返回",
      "expected": "列表展示命中子层级的父级记录 orderInfo，点击「+」后可见 orderStatus 子层级记录"
    },
    {
      "action": "清空搜索框，等待列表恢复",
      "expected": "列表恢复显示所有第一层级数据"
    }
  ]
} as const;

test.describe("验证【数据质量 通用配置-json格式校验管理 搜索与筛选】key名模糊搜索功能（含子层级key命中）", () => {
  test("C1177 验证【数据质量 通用配置-json格式校验管理 搜索与筛选】key名模糊搜索功能（含子层级key命中）", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
