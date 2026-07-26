// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C052",
  "title": "验证数据表列表分页功能正确",
  "steps": [
    {
      "action": "分页相关UI CHECK",
      "expected": "共1000条数据\n<>跳转按钮\n页码展示\nPageSize 10条/页"
    },
    {
      "action": "选择页码，点击页码",
      "expected": "页码跳转正常，列表数据更新正确"
    },
    {
      "action": "点击\"<\"按钮",
      "expected": "跳转到上一页，列表数据更新正确"
    },
    {
      "action": "点击\">\"按钮",
      "expected": "跳转到下一页，列表数据更新正确"
    },
    {
      "action": "点击PageSize配置框",
      "expected": "展示\n10条/页\n20条/页\n50条/页\n100条/页"
    },
    {
      "action": "选择10条/页",
      "expected": "页码更新正确，列表数据1页最多展示10条"
    },
    {
      "action": "选择20条/页",
      "expected": "页码更新正确，列表数据1页最多展示20条"
    },
    {
      "action": "选择50条/页",
      "expected": "页码更新正确，列表数据1页最多展示50条"
    },
    {
      "action": "选择100条/页",
      "expected": "页码更新正确，列表数据1页最多展示100条"
    },
    {
      "action": "搜索表名包含“test”的表，搜索后点击分页页码跳转下一页",
      "expected": "跳转正确，数据展示正确"
    },
    {
      "action": "搜索表名包含“test”的表，搜索后由“10条/页”换成“50条/页”",
      "expected": "页码更新正确，数据展示正确"
    }
  ]
} as const;

test.describe("验证数据表列表分页功能正确", () => {
  test("C052 验证数据表列表分页功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
