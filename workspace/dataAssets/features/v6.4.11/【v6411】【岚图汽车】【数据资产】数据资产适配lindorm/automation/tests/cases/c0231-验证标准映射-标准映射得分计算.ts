// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0231",
  "title": "验证标准映射-标准映射得分计算",
  "steps": [
    {
      "action": "准备数据标准如下：\n\t- 标准英文名称：amount\n\n准备四张表同步至数据地图，字段如下：\n\t- 表A.colA：user_amount；\n\t- 表B.colB：amount；\n\t- 表C.colC：user_amt;\n\t- 表D.colD：user_amount_amount;\n\n对amount数据标准进行标准映射；\n查看映射记录",
      "expected": "映射记录中排序为：表B.colB  > 表A.colA > 表D.colD ；\n表C.colC不显示"
    }
  ]
} as const;

test.describe("验证标准映射-标准映射得分计算", () => {
  test("C0231 验证标准映射-标准映射得分计算", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
