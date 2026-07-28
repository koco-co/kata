// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0106",
  "title": "验证物化视图技术属性显示正确",
  "steps": [
    {
      "action": "1) 进入物化视图-表详情页；\n2) 查看技术属性",
      "expected": "1) 去除“存储大小”和“视图定义”；\n2) 增加显示“视图名”且数据正确；\n3) 增加显示“源表名”且数据正确；\n4. 增加显示“视图行数”且数据正确；\n5. 增加显示“视图类型”且数据正确；"
    }
  ]
} as const;

test.describe("验证物化视图技术属性显示正确", () => {
  test("C0106 验证物化视图技术属性显示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
