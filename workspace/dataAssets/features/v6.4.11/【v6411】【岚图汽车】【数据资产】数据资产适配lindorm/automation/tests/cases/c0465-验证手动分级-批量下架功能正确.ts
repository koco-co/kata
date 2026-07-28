// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0465",
  "title": "验证手动分级-批量下架功能正确",
  "steps": [
    {
      "action": "选择一个分级数据，点击下架，二次确认后",
      "expected": "提示：下架成功；\n列表不显示当前分级数据；\nmetadata_data_rank_link表对应的数据的is_deleted=1；\nmetadata_data_rank_link_history表对应当前字段的分级历史的is_deleted=0；"
    },
    {
      "action": "选择多个分级数据，点击下架，二次确认后",
      "expected": "提示：下架成功；\n列表不显示选中的分级数据；\nmetadata_data_rank_link表对应的数据的is_deleted=1；\nmetadata_data_rank_link_history表对应当前字段的分级历史的is_deleted=0；"
    }
  ]
} as const;

test.describe("验证手动分级-批量下架功能正确", () => {
  test("C0465 验证手动分级-批量下架功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
