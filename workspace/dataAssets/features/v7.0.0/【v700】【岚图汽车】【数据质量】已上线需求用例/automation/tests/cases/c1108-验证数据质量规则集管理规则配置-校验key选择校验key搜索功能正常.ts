// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1108",
  "title": "验证【数据质量 规则集管理 规则配置-校验key选择】校验key搜索功能正常",
  "steps": [
    {
      "action": "进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成",
      "expected": "规则集管理页面正常打开，列表加载完成"
    },
    {
      "action": "找到规则集\"rule_set_key_search_test\"，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在\"key搜索测试包\"中点击【新增规则】，添加有效性校验规则，按如下配置：\n- *字段：info（json）\n-*统计规则：格式-json格式校验\n展开「校验key」下拉框，在搜索框中输入「order」",
      "expected": "下拉列表过滤展示，仅显示包含「order」的key：「order-amount」和「order-status」；「user-name」不在列表中显示"
    },
    {
      "action": "清空搜索框内容，查看下拉列表",
      "expected": "下拉列表恢复展示全部key，「order-amount」「order-status」「user-name」均重新显示"
    }
  ]
} as const;

test.describe("验证【数据质量 规则集管理 规则配置-校验key选择】校验key搜索功能正常", () => {
  test("C1108 验证【数据质量 规则集管理 规则配置-校验key选择】校验key搜索功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
