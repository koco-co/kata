// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1101",
  "title": "验证【数据质量 规则集管理 规则配置参数展示】保存后规则配置参数展示区域各字段内容正确",
  "steps": [
    {
      "action": "进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成",
      "expected": "规则集管理页面正常打开，列表加载完成"
    },
    {
      "action": "找到规则集\"rule_set_param_display_test\"，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，查看\"参数展示测试包\"中已配置的「格式-json格式校验」规则行的参数展示区域",
      "expected": "规则配置参数展示区域各字段内容如下：\n1) 规则类型=「字段级」\n2) 字段=「device_info」\n3) 统计规则=「格式-json格式校验」\n4) 校验key=「device-type」\n5) 强弱规则=「强规则」"
    }
  ]
} as const;

test.describe("验证【数据质量 规则集管理 规则配置参数展示】保存后规则配置参数展示区域各字段内容正确", () => {
  test("C1101 验证【数据质量 规则集管理 规则配置参数展示】保存后规则配置参数展示区域各字段内容正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
