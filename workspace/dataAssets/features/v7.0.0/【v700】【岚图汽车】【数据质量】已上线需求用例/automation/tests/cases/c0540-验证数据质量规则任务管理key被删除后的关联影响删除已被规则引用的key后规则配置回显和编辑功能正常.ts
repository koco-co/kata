// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0540",
  "title": "验证【数据质量 规则任务管理 key被删除后的关联影响】删除已被规则引用的key后规则配置回显和编辑功能正常",
  "steps": [
    {
      "action": "进入【通用配置 → json格式校验管理】页面，等待列表加载完成",
      "expected": "json格式校验管理页面正常打开，列表加载完成"
    },
    {
      "action": "找到\"key_del_2（测试名2）\"，点击操作列的【删除】按钮，在确认弹窗中点击【确定】，等待删除成功提示",
      "expected": "key_del_2删除成功，列表中不再显示key_del_2"
    },
    {
      "action": "进入【数据质量 → 规则集管理】页面，找到\"rule_set_key_del_test\"，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，查看已配置的key范围校验规则的校验内容回显",
      "expected": "校验内容回显中key_del_2已被自动移除，剩余key_del_1和key_del_3正常显示"
    },
    {
      "action": "点击该规则的【编辑】按钮，打开校验内容下拉框，观察可选key列表",
      "expected": "校验内容下拉框中不再显示key_del_2，key_del_1和key_del_3正常展示可选，编辑功能正常可用"
    }
  ]
} as const;

test.describe("验证【数据质量 规则任务管理 key被删除后的关联影响】删除已被规则引用的key后规则配置回显和编辑功能正常", () => {
  test("C0540 验证【数据质量 规则任务管理 key被删除后的关联影响】删除已被规则引用的key后规则配置回显和编辑功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
