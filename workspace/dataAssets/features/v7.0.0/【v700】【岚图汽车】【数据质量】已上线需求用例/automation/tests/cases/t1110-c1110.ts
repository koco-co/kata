// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1110",
  "title": "验证【数据质量 规则集管理 规则配置-校验key选择】校验key列表中仅配置了value格式的key可被选中，未配置value格式的key不可选中",
  "steps": [
    {
      "action": "进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成",
      "expected": "规则集管理页面正常打开，列表加载完成"
    },
    {
      "action": "找到规则集\"rule_set_key_select_test\"，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在\"key选择测试包\"中点击【新增规则】，添加有效性校验规则，按如下配置：\n- *字段：info（json）\n-*统计规则：格式-json格式校验\n展开「校验key」下拉选择框，查看列表中各key的可选状态",
      "expected": "「校验key」下拉框列表中：\n1) 「product-name」（已配置value格式）显示为可选状态，可点击勾选\n2) 「product-code」（已配置value格式）显示为可选状态，可点击勾选\n3) 「product-desc」（未配置value格式）显示为不可选状态，置灰禁用"
    },
    {
      "action": "点击「product-desc」进行选中操作",
      "expected": "「product-desc」无法被选中，复选框保持未勾选状态"
    },
    {
      "action": "点击勾选「product-name」和「product-code」",
      "expected": "「product-name」和「product-code」均成功勾选，下拉框输入框内回显「product-name;product-code」"
    }
  ]
} as const;

test.describe("验证【数据质量 规则集管理 规则配置-校验key选择】校验key列表中仅配置了value格式的key可被选中，未配置value格式的key不可选中", () => {
  test("C1110 验证【数据质量 规则集管理 规则配置-校验key选择】校验key列表中仅配置了value格式的key可被选中，未配置value格式的key不可选中", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
