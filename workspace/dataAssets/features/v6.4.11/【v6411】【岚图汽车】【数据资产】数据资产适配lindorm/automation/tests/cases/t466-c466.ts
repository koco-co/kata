// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C466",
  "title": "验证手动分级-下架功能正确",
  "steps": [
    {
      "action": "选择分级数据后，点击下架",
      "expected": "显示二次确认弹框"
    },
    {
      "action": "查看二次确认弹框显示",
      "expected": "您确认下架该字段分级，恢复至未分级状态吗？”【确认/取消】"
    },
    {
      "action": "点击确定",
      "expected": "提示：下架成功；\n列表不显示当前分级数据；\nassets_data_rank_link表对应的数据的is_deleted=1；\nassets_data_rank_link_history表对应当前字段的分级历史的is_deleted=0；"
    },
    {
      "action": "点击取消",
      "expected": "取消下架功能"
    }
  ]
} as const;

test.describe("验证手动分级-下架功能正确", () => {
  test("C466 验证手动分级-下架功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
