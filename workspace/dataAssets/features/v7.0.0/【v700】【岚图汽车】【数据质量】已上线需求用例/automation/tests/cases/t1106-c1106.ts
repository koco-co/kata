// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1106",
  "title": "验证【数据质量 规则集管理 规则配置-校验key选择】校验key回显格式及勾选仅对当前层级生效",
  "steps": [
    {
      "action": "进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成",
      "expected": "规则集管理页面正常打开，列表加载完成"
    },
    {
      "action": "找到规则集\"rule_set_layer_key_test\"，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在\"层级key测试包\"中点击【新增规则】，添加有效性校验规则，按如下配置：\n- *字段：info（json）\n-*统计规则：格式-json格式校验\n展开「校验key」下拉框，勾选「person-name」和「address-city」，点击【保存】",
      "expected": "规则保存成功；规则行的「校验key」列回显内容为「person-name;address-city」，分号分隔不同key路径，连字符分隔层级"
    },
    {
      "action": "编辑该规则，重新展开「校验key」下拉框，查看已勾选的key是否正确回显",
      "expected": "1) 「person-name」复选框显示为勾选状态\n2) 「address-city」复选框显示为勾选状态\n3) 「person-age」复选框显示为未勾选状态"
    }
  ]
} as const;

test.describe("验证【数据质量 规则集管理 规则配置-校验key选择】校验key回显格式及勾选仅对当前层级生效", () => {
  test("C1106 验证【数据质量 规则集管理 规则配置-校验key选择】校验key回显格式及勾选仅对当前层级生效", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
