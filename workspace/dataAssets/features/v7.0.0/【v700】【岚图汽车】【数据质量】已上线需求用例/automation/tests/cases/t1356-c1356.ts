// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1356",
  "title": "验证【「数据标准」-「标准定义」字段调整】「标准管理」-「标准定义」-「新建标准」配置扩充",
  "steps": [
    {
      "action": "进入【资产】-【数据标准】-【标准管理】-【标准定义】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击【新建标准】按钮",
      "expected": "进入[新建标准]配置页面"
    },
    {
      "action": "UI Check",
      "expected": "【业务属性】\n新增了【车型/车系】树形目录，最大支持配置20个（超出提示\"车型最大支持配置20个！\"）\n【技术属性】\n新增了【车型/车系】选择栏，点击出现下拉框，对车型或车系进行选择；在【取值范围】后出现【初始值】、【无效值】、【精度倍数】、【偏移量】，四项属性皆为输入框"
    }
  ]
} as const;

test.describe("验证【「数据标准」-「标准定义」字段调整】「标准管理」-「标准定义」-「新建标准」配置扩充", () => {
  test("C1356 验证【「数据标准」-「标准定义」字段调整】「标准管理」-「标准定义」-「新建标准」配置扩充", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
