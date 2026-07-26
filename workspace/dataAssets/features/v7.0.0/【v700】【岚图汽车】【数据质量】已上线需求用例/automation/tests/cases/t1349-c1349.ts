// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1349",
  "title": "验证【「数据标准」-「标准定义」字段调整】「标准管理」-「标准定义」扩充配置数据类型及输入限制",
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
      "action": "业务属性配置如下：\n[中文名称] 测试\n[英文名称] test\n[标准目录] tst",
      "expected": "【技术属性】配置完成"
    },
    {
      "action": "技术属性配置如下：\n[初始值] 1\n[无效值] 123456789\n[精度倍数] 1.11\n[偏移量] 11111111.11111111",
      "expected": "【技术属性】配置完成"
    },
    {
      "action": "尝试修改技术属性配置如下：\n[初始值] a\n[无效值] @\n[精度倍数] 啊\n[偏移量] K",
      "expected": "无法输入"
    }
  ]
} as const;

test.describe("验证【「数据标准」-「标准定义」字段调整】「标准管理」-「标准定义」扩充配置数据类型及输入限制", () => {
  test("C1349 验证【「数据标准」-「标准定义」字段调整】「标准管理」-「标准定义」扩充配置数据类型及输入限制", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
