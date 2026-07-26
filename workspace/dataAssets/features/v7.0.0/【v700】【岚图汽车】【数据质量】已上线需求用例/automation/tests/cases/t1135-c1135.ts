// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1135",
  "title": "验证【数据质量 规则集管理 规则配置-key范围校验基础功能】校验内容回显格式为同层级key用横线拼接不同层级用分号分隔",
  "steps": [
    {
      "action": "进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成",
      "expected": "规则集管理页面正常打开，列表加载完成"
    },
    {
      "action": "找到\"rule_set_key_range_test\"，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在\"key范围校验测试包\"中点击【新增规则】，统计函数选择\"key范围校验\"，字段选择\"info\"，打开校验内容下拉框，在第一层级勾选\"key1（姓名）\"和\"key2（年龄）\"，在第二层级勾选\"key11（省份）\"和\"key22（城市）\"，点击【确认】",
      "expected": "规则集编辑页正常打开，Step 2 监控规则页面加载完成，已有配置回显正确"
    },
    {
      "action": "查看规则配置表单中\"校验内容\"字段的回显内容",
      "expected": "校验内容回显格式为\"key1-key2;key11-key22\"，同层级key用\"-\"连接，不同层级配置组之间用\";\"分隔"
    },
    {
      "action": "点击【保存】按钮，等待保存成功后再次点击该规则行进入编辑页面，查看已保存的校验内容展示",
      "expected": "已保存的规则中校验内容回显仍为\"key1-key2;key11-key22\"，格式不变"
    }
  ]
} as const;

test.describe("验证【数据质量 规则集管理 规则配置-key范围校验基础功能】校验内容回显格式为同层级key用横线拼接不同层级用分号分隔", () => {
  test("C1135 验证【数据质量 规则集管理 规则配置-key范围校验基础功能】校验内容回显格式为同层级key用横线拼接不同层级用分号分隔", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
