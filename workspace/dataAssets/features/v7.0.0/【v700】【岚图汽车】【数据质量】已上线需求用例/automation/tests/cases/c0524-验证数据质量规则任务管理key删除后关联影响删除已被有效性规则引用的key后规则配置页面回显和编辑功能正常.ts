// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0524",
  "title": "验证【数据质量 规则任务管理 key删除后关联影响】删除已被有效性规则引用的key后规则配置页面回显和编辑功能正常",
  "steps": [
    {
      "action": "进入【通用配置 → json格式校验管理】页面，等待列表加载完成",
      "expected": "json格式校验管理页面正常加载，列表中显示「del-key-a」和「del-key-b」"
    },
    {
      "action": "找到「del-key-a」行，点击操作列的【删除】按钮，在确认弹窗中点击【确定】，等待删除完成",
      "expected": "删除成功，列表中不再显示「del-key-a」，仅保留「del-key-b」"
    },
    {
      "action": "进入【数据质量 → 规则集管理】页面，找到规则集\"rule_set_key_del_test\"，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，查看「格式-json格式校验」规则行的「校验key」回显内容",
      "expected": "规则配置页面正常加载，「校验key」列回显内容中「del-key-a」已从校验key列表中移除，「del-key-b」正常显示"
    },
    {
      "action": "点击该规则行的【编辑】按钮，展开「校验key」下拉框",
      "expected": "下拉框正常打开，列表中不再显示已删除的「del-key-a」，「del-key-b」显示为已勾选状态"
    },
    {
      "action": "点击【保存】按钮",
      "expected": "规则保存成功，「校验key」列回显「del-key-b」"
    }
  ]
} as const;

test.describe("验证【数据质量 规则任务管理 key删除后关联影响】删除已被有效性规则引用的key后规则配置页面回显和编辑功能正常", () => {
  test("C0524 验证【数据质量 规则任务管理 key删除后关联影响】删除已被有效性规则引用的key后规则配置页面回显和编辑功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
