// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0452",
  "title": "验证级别管理-添加级别-功能正确",
  "steps": [
    {
      "action": "点击添加级别",
      "expected": "弹出「添加级别」弹窗"
    },
    {
      "action": "不输入级别名称，点击确认",
      "expected": "级别名称下出现提示：“级别名称不可为空”"
    },
    {
      "action": "输入空格，点击确认",
      "expected": "级别名称下出现提示：“不允许输入空格！”"
    },
    {
      "action": "输入内容，点击取消",
      "expected": "该级别未添加"
    },
    {
      "action": "输入内容，点击确认",
      "expected": "级别添加成功，显示在级别列表最底层，级别数显示为所在行数；\n“手动分级”、“自动分级”、“分级数据”页面的级别枚举值相应添加该级别"
    }
  ]
} as const;

test.describe("验证级别管理-添加级别-功能正确", () => {
  test("C0452 验证级别管理-添加级别-功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
