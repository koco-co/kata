// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0973",
  "title": "验证「已配置报告」-页面分页功能正常",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【数据质量报告】页面, 检查分页控件",
      "expected": "1）每页显示20条记录2）底部展示\"共N条数据, 每页显示20条\"，可选每页展示10/20/50/100/200条数据"
    },
    {
      "action": "点击页码",
      "expected": "跳转至对应的页码页面"
    },
    {
      "action": "点击\"<\"",
      "expected": "向前翻页"
    },
    {
      "action": "点击\">\"",
      "expected": "向后翻页"
    },
    {
      "action": "切换每页展示数量",
      "expected": "每页展示记录数为切换后的数量"
    }
  ]
} as const;

test.describe("验证「已配置报告」-页面分页功能正常", () => {
  test("C0973 验证「已配置报告」-页面分页功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
