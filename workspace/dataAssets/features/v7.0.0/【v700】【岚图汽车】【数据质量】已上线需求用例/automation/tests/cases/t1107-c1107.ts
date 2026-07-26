// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1107",
  "title": "验证【数据质量 规则集管理 规则配置-校验key选择】校验key数据量超过200条时默认加载前200条展示",
  "steps": [
    {
      "action": "进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成",
      "expected": "规则集管理页面正常打开，列表加载完成"
    },
    {
      "action": "找到规则集\"rule_set_large_key_test\"，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在\"大数据量key测试包\"中点击【新增规则】，添加有效性校验规则，按如下配置：\n- *字段：info（json）\n-*统计规则：格式-json格式校验\n展开「校验key」下拉框，观察初始加载的key列表",
      "expected": "「校验key」下拉框初始展示前200条key（test-key-001 至 test-key-200），第201条及以后的key（test-key-201至test-key-210）不在初始列表中显示"
    },
    {
      "action": "在搜索框中输入「test-key-205」进行搜索",
      "expected": "搜索结果中显示「test-key-205」，可正常选中"
    }
  ]
} as const;

test.describe("验证【数据质量 规则集管理 规则配置-校验key选择】校验key数据量超过200条时默认加载前200条展示", () => {
  test("C1107 验证【数据质量 规则集管理 规则配置-校验key选择】校验key数据量超过200条时默认加载前200条展示", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
