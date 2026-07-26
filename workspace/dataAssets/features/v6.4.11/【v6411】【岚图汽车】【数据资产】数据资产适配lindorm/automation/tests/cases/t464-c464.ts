// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C464",
  "title": "验证手动分级-列表数据展示正确",
  "steps": [
    {
      "action": "查看列头显示",
      "expected": "多选框、字段名、级别、字段中文名、分类、分级方式、表名、数据库、数据源、数据源类型、分级时间、操作"
    },
    {
      "action": "如果列过长，查看列头显示",
      "expected": "1）多选框、字段名、操作列固定；\n2）其余可左右移动"
    },
    {
      "action": "查看筛选项显示",
      "expected": "1）显示在分类、分级方式、数据源类型右侧；\n2）显示筛选图标"
    },
    {
      "action": "查看列表数据显示_列表为空",
      "expected": "显示暂无数据"
    },
    {
      "action": "查看列表排序",
      "expected": "根据分级时间倒序排列（assets_data_rank_link表中的update_at）"
    },
    {
      "action": "查看翻页",
      "expected": "每页默认显示20条数据，可正常切换每页显示条数"
    },
    {
      "action": "查看操作列显示",
      "expected": "历史记录、下架、编辑"
    }
  ]
} as const;

test.describe("验证手动分级-列表数据展示正确", () => {
  test("C464 验证手动分级-列表数据展示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
