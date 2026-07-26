// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C200",
  "title": "验证标准目录-删除",
  "steps": [
    {
      "action": "1）一级目录NNN下无数据标准\n2）二次确认删除",
      "expected": "删除成功"
    },
    {
      "action": "1）二级目录yyy下无数据标准\n2）二次确认删除",
      "expected": "删除成功"
    },
    {
      "action": "1）一级目录XXX下存在数据标准和标准映射结果\n2）二次确认删除\n3）当前页面查看XXX下的数据标准\n4）进入「标准映射」页查看目录",
      "expected": "1）一级目录XXX删除成功\n2）XXX下的数据标准被删除成功\n3）XXX下的该目录下的标准映射结果被删除成功"
    }
  ]
} as const;

test.describe("验证标准目录-删除", () => {
  test("C200 验证标准目录-删除", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
