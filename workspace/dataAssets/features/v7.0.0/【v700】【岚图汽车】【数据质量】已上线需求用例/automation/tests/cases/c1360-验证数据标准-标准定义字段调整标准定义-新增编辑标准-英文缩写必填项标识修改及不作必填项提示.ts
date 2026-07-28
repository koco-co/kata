// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1360",
  "title": "验证【「数据标准」-「标准定义」字段调整】「标准定义」-「新增/编辑标准」-「英文缩写」必填项标识修改及不作必填项提示",
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
      "action": "业务属性配置如下：\n[中文名称] 测试\n[英文名称] Test_&Box\n[英文缩写] 不作填写\n[标准目录] tst\n（非必填项不作填写）",
      "expected": "[新建标准]配置完成，[英文缩写]字段前无红色\"*\"（必填项标识），不作填写的情况下焦点离开输入框未提示\"请输入名称\""
    }
  ]
} as const;

test.describe("验证【「数据标准」-「标准定义」字段调整】「标准定义」-「新增/编辑标准」-「英文缩写」必填项标识修改及不作必填项提示", () => {
  test("C1360 验证【「数据标准」-「标准定义」字段调整】「标准定义」-「新增/编辑标准」-「英文缩写」必填项标识修改及不作必填项提示", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
