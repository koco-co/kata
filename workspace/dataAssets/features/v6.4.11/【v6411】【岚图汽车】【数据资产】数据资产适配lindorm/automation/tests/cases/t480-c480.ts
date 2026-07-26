// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C480",
  "title": "验证自动分级-规则详情-数据展示正确",
  "steps": [
    {
      "action": "点击规则，查看详情页中规则信息的显示",
      "expected": "右侧抽屉展示规则详情；\n显示规则名称、规则信息、分级数据、生效时间；\n分级数据显示：字段名、字段中文名、表名、数据库、数据源、分级时间；\n分级数据默认加载20条记录，按照分级时间倒序；"
    },
    {
      "action": "生效时间",
      "expected": "默认展示最新的生效时间"
    }
  ]
} as const;

test.describe("验证自动分级-规则详情-数据展示正确", () => {
  test("C480 验证自动分级-规则详情-数据展示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
