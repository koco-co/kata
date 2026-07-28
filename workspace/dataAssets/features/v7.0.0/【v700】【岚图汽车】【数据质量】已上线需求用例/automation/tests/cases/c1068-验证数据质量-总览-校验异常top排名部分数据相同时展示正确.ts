// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1068",
  "title": "验证「数据质量-总览」-「校验异常top排名」部分数据相同时展示正确",
  "steps": [
    {
      "action": "进入【资产-数据质量-总览】页面",
      "expected": "页面正常进入"
    },
    {
      "action": "查看【校验异常排名】详情",
      "expected": "展示为：\n1）第一行为表B相关详情，第二行为表A相关详情（表A和表B异常数相同，按最近一次校验时间排序）\n2）第三行为表C相关详情，第四行为表D相关详情（表C和表D异常数和最近一次校验时间都相同，按表名字母先后排序）"
    }
  ]
} as const;

test.describe("验证「数据质量-总览」-「校验异常top排名」部分数据相同时展示正确", () => {
  test("C1068 验证「数据质量-总览」-「校验异常top排名」部分数据相同时展示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
