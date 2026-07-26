// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C469",
  "title": "验证手动分级-查询功能正确",
  "steps": [
    {
      "action": "选择左侧级别后，再次输入关键字搜索和筛选分类",
      "expected": "列表同时显示根据级别和搜索以及筛选后的分级数据"
    },
    {
      "action": "选择左侧级别，再次输入关键字搜索和筛选分类后，点击关键字搜索框的重置按钮",
      "expected": "列表显示根据级别筛选出来的分级数据"
    },
    {
      "action": "选择左侧级别，再次输入关键字搜索和筛选分类后，点击筛选分类的重置按钮",
      "expected": "列表同时显示根据级别和搜索后的分级数据"
    },
    {
      "action": "选择左侧级别，再次输入关键字搜索和筛选分类后，点击选择的级别",
      "expected": "列表同时显示根据搜索和筛选后的分级数据"
    }
  ]
} as const;

test.describe("验证手动分级-查询功能正确", () => {
  test("C469 验证手动分级-查询功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
