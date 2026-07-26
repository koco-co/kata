// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C456",
  "title": "验证级别管理-置顶级别-功能正确",
  "steps": [
    {
      "action": "查看第一行级别的置顶icon",
      "expected": "置顶icon置灰，不可点击"
    },
    {
      "action": "点击最后一行级别A的置顶icon",
      "expected": "级别A移动到第一行，置顶icon置灰，不可点击；\n其余级别排列顺序不变，级别显示为当前行编号；\n“手动分级”、“自动分级”、“分级数据”页面的级别枚举值显示为移动后顺序"
    },
    {
      "action": "点击中间级别B的置顶icon",
      "expected": "级别B移动到第一行，置顶icon置灰，不可点击；\n其余级别排列顺序不变，级别显示为当前行编号；\n“手动分级”、“自动分级”、“分级数据”页面的级别枚举值显示为移动后顺序"
    }
  ]
} as const;

test.describe("验证级别管理-置顶级别-功能正确", () => {
  test("C456 验证级别管理-置顶级别-功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
