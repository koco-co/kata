// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C457",
  "title": "验证级别管理-拖动调整顺序-功能正确",
  "steps": [
    {
      "action": "查看级别列表关于拖动的提示",
      "expected": "默认提示显示：点按当前行可拖动改变顺序，请谨慎调整级别顺序，调整后会改变字段的分级逻辑！（自动分级时以级别高的为准）"
    },
    {
      "action": "无正在分级中规则时，拖动级别A移动到其他位置",
      "expected": "级别A移动成功，“手动分级”、“自动分级”、“分级数据”页面的级别枚举值显示为移动后顺序"
    },
    {
      "action": "有正在分级中规则时，拖动级别B移动到其他位置",
      "expected": "1）级别B移动成功，“手动分级”、“自动分级”、“分级数据”页面的级别枚举值显示为移动后顺序；\n2）调整分级后toast提示：调整后无法影响正在分级中的规则已生效的部分字段，若要修正数据请重新生效相关规则！"
    }
  ]
} as const;

test.describe("验证级别管理-拖动调整顺序-功能正确", () => {
  test("C457 验证级别管理-拖动调整顺序-功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
