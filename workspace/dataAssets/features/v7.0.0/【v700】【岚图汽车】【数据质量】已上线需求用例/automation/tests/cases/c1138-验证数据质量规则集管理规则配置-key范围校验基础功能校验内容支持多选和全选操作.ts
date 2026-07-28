// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1138",
  "title": "验证【数据质量 规则集管理 规则配置-key范围校验基础功能】校验内容支持多选和全选操作",
  "steps": [
    {
      "action": "进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成",
      "expected": "规则集管理页面正常打开，列表加载完成"
    },
    {
      "action": "找到\"rule_set_key_range_test\"，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在\"key范围校验测试包\"中点击【新增规则】，统计函数选择\"key范围校验\"，字段选择\"info\"，点击校验内容下拉框，等待下拉列表加载完成",
      "expected": "规则集编辑页正常打开，Step 2 监控规则页面加载完成，已有配置回显正确"
    },
    {
      "action": "在校验内容下拉框中依次勾选\"key1（姓名）\"、\"key2（年龄）\"、\"key3（性别）\"三个选项",
      "expected": "勾选3个key后，下拉框内显示已选中3项，各key名前复选框呈选中状态"
    },
    {
      "action": "点击下拉框顶部的【全部】选项",
      "expected": "点击\"全部\"后，所有6个key（key1、key2、key3、key11、key22、key33）全部被勾选，\"全部\"选项呈全选状态"
    },
    {
      "action": "再次点击【全部】选项",
      "expected": "所有key全部取消勾选，\"全部\"选项恢复未选状态"
    },
    {
      "action": "重新勾选\"key1（姓名）\"和\"key11（省份）\"，点击【确认】按钮，查看校验内容回显",
      "expected": "确认后，规则配置中校验内容回显格式为\"key1;key11\"（同层级key用\"-\"拼接，不同层级配置组用\";\"分隔）"
    }
  ]
} as const;

test.describe("验证【数据质量 规则集管理 规则配置-key范围校验基础功能】校验内容支持多选和全选操作", () => {
  test("C1138 验证【数据质量 规则集管理 规则配置-key范围校验基础功能】校验内容支持多选和全选操作", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
