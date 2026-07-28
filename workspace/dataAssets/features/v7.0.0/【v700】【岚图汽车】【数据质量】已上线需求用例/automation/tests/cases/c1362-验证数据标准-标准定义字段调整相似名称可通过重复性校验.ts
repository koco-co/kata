// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1362",
  "title": "验证【「数据标准」-「标准定义」字段调整】相似名称可通过重复性校验",
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
      "action": "业务属性配置如下：\n[中文名称] 测试\n[英文名称] Test_&Box\n[英文缩写] t_b\n[标准目录] tst\n（非必填项不作填写）",
      "expected": "[新建标准]配置完成"
    },
    {
      "action": "点击【保存】按钮",
      "expected": "弹出提示\"数据标准保存成功\"，返回【标准定义】页面"
    },
    {
      "action": "点击【新建标准】按钮",
      "expected": "进入[新建标准]配置页面"
    },
    {
      "action": "业务属性配置如下：\n[中文名称] 测试\n[英文名称]\nTest &Box\nTest_&box\n[英文缩写]\nt b\nT_b\nt_B\n[标准目录] tst\n（非必填项不作填写）",
      "expected": "[新建标准]配置完成"
    },
    {
      "action": "点击【保存】按钮",
      "expected": "弹出提示\"数据标准保存成功\"，返回【标准定义】页面"
    }
  ]
} as const;

test.describe("验证【「数据标准」-「标准定义」字段调整】相似名称可通过重复性校验", () => {
  test("C1362 验证【「数据标准」-「标准定义」字段调整】相似名称可通过重复性校验", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
