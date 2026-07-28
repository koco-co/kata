// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0050",
  "title": "验证【修改时间】排序功能正常",
  "steps": [
    {
      "action": "在15:00给表A字段添加标签TAG_A",
      "expected": "表A字段标签添加成功"
    },
    {
      "action": "在15:01给表B字段添加标签TAG_B",
      "expected": "表B字段标签添加成功"
    },
    {
      "action": "在15:02给表C字段添加标签TAG_C",
      "expected": "表C字段标签添加成功"
    },
    {
      "action": "点击【修改时间】升序排序",
      "expected": "表展示顺序为A、B、C"
    },
    {
      "action": "点击【修改时间】降序排序",
      "expected": "表展示顺序为C、B、A"
    }
  ]
} as const;

test.describe("验证【修改时间】排序功能正常", () => {
  test("C0050 验证【修改时间】排序功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
